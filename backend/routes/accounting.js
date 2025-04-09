const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Middleware to check for Accounting or SuperAdmin role
const checkAccountingAccess = (req, res, next) => {
    if (!req.user || (req.user.role !== 'Accounting' && req.user.role !== 'SuperAdmin')) {
        return res.status(403).json({ success: false, message: 'Forbidden: Requires Accounting or SuperAdmin privileges.' });
    }
    next();
};

// GET /api/accounting/billing-queue
router.get('/billing-queue', authenticateToken, checkAccountingAccess, async (req, res) => {
    console.log('[API GET /accounting/billing-queue] Request received');
    try {
        const result = await pool.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.DateScheduled AS DateCompleted, 
                c.CourseNumber, c.Location, c.StudentsRegistered, c.Notes, c.Status,
                o.OrganizationName,
                ct.CourseTypeName,
                -- Calculate actual attendance count
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as studentsAttendance 
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Students s ON c.CourseID = s.CourseID 
            WHERE c.Status = 'Billing Ready'
            GROUP BY c.CourseID, c.CreatedAt, c.DateScheduled, c.CourseNumber, c.Location, 
                     c.StudentsRegistered, c.Notes, c.Status, o.OrganizationName, ct.CourseTypeName
            ORDER BY c.CreatedAt ASC -- Oldest requests first
        `);
        
        res.json({ success: true, courses: result.rows });

    } catch (err) {
        console.error("[API GET /accounting/billing-queue] Error:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch billing queue.' });
    }
});

// POST /api/accounting/create-invoice/:courseId
router.post('/create-invoice/:courseId', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { courseId } = req.params;
    console.log(`[API POST /accounting/create-invoice/${courseId}] Request received`);

    if (isNaN(parseInt(courseId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Course ID format.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Course Details and Attendance Count (ensure it's ready for billing)
        const courseResult = await client.query(`
            SELECT 
                c.CourseID, c.OrganizationID, c.CourseTypeID, c.DateScheduled,
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as studentsAttendance
            FROM Courses c
            LEFT JOIN Students s ON c.CourseID = s.CourseID
            WHERE c.CourseID = $1 AND c.Status = 'Billing Ready'
            GROUP BY c.CourseID, c.OrganizationID, c.CourseTypeID, c.DateScheduled
        `, [courseId]);

        if (courseResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Course not found or not ready for billing.' });
        }
        const course = courseResult.rows[0];
        const studentsAttendance = parseInt(course.studentsattendance, 10);

        // 2. Determine Rate from Pricing Table
        const priceResult = await client.query(
            'SELECT Price FROM OrganizationCoursePricing WHERE OrganizationID = $1 AND CourseTypeID = $2',
            [course.organizationid, course.coursetypeid]
        );

        let ratePerStudent = null;
        if (priceResult.rowCount > 0) {
            ratePerStudent = parseFloat(priceResult.rows[0].price);
        } else {
            // *** POLICY DECISION: What to do if no specific price rule exists? ***
            // Option A: Fail the request
            await client.query('ROLLBACK');
            console.warn(`[Create Invoice] No pricing rule found for OrgID ${course.organizationid}, CourseTypeID ${course.coursetypeid}`);
            return res.status(400).json({ success: false, message: 'No specific price defined for this organization and course type.' });
            // Option B: Use a global default rate (e.g., from CourseTypes table or environment variable - requires schema/code changes)
            // ratePerStudent = DEFAULT_RATE; 
        }

        // 3. Calculate Total Amount
        const totalAmount = studentsAttendance * ratePerStudent;

        // 4. Generate Invoice Details
        const invoiceDate = new Date();
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(invoiceDate.getDate() + 30); // Due 30 days from now
        const invoiceNumber = `${invoiceDate.toISOString().slice(0,10).replace(/-/g,'')}-${courseId}`;

        // 5. Insert Invoice Record
        const invoiceInsertResult = await client.query(`
            INSERT INTO Invoices (CourseID, InvoiceNumber, InvoiceDate, Amount, PaymentStatus, DueDate)
            VALUES ($1, $2, $3, $4, 'Pending', $5)
            RETURNING *
        `, [courseId, invoiceNumber, invoiceDate, totalAmount, dueDate]);
        const newInvoice = invoiceInsertResult.rows[0];

        // 6. Update Course Status to 'Invoiced'
        await client.query(
            `UPDATE Courses SET Status = 'Invoiced', UpdatedAt = CURRENT_TIMESTAMP WHERE CourseID = $1`,
            [courseId]
        );

        await client.query('COMMIT');
        console.log(`[Create Invoice] Invoice ${invoiceNumber} created successfully for course ${courseId}`);
        res.status(201).json({ success: true, message: `Invoice ${invoiceNumber} created successfully.`, invoice: newInvoice });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Create Invoice] Error creating invoice for course ${courseId}:`, err);
        if (err.code === '23505' && err.constraint === 'invoices_invoicenumber_key') {
             return res.status(409).json({ success: false, message: 'Failed to create invoice: Invoice number conflict. Please try again.' });
        }
        res.status(500).json({ success: false, message: 'Failed to create invoice.' });
    } finally {
        client.release();
    }
});

// GET /api/accounting/invoices
router.get('/invoices', authenticateToken, checkAccountingAccess, async (req, res) => {
    console.log('[API GET /accounting/invoices] Request received');
    try {
        const result = await pool.query(`
            SELECT 
                i.InvoiceID, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.Amount, i.PaymentStatus, 
                c.CourseNumber, 
                o.OrganizationName
            FROM Invoices i
            JOIN Courses c ON i.CourseID = c.CourseID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            ORDER BY i.InvoiceDate DESC -- Show newest invoices first
        `);
        
        res.json({ success: true, invoices: result.rows });

    } catch (err) {
        console.error("[API GET /accounting/invoices] Error:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch invoices.' });
    }
});

module.exports = router; 