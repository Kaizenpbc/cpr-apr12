const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const { createEtherealTransporter, sendInvoiceEmail } = require('../services/emailService');
const { generateInvoicePDF } = require('../services/pdfService');

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
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as studentsAttendance, 
                -- Fetch the price per student
                ocp.Price as ratePerStudent 
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Students s ON c.CourseID = s.CourseID 
            -- Left join to get pricing, may be null if no rule exists
            LEFT JOIN OrganizationCoursePricing ocp ON c.OrganizationID = ocp.OrganizationID AND c.CourseTypeID = ocp.CourseTypeID
            WHERE c.Status = 'Billing Ready'
            GROUP BY c.CourseID, c.CreatedAt, c.DateScheduled, c.CourseNumber, c.Location, 
                     c.StudentsRegistered, c.Notes, c.Status, o.OrganizationName, ct.CourseTypeName,
                     ocp.Price -- Include price in GROUP BY
            ORDER BY c.CreatedAt ASC -- Oldest requests first
        `);
        
        console.log(`[API GET /accounting/billing-queue] Found ${result.rows.length} courses.`);
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

// GET /api/accounting/invoices/:invoiceId - Fetch details for a single invoice
router.get('/invoices/:invoiceId', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { invoiceId } = req.params;
    console.log(`[API GET /accounting/invoices/${invoiceId}] Request received`);

    if (isNaN(parseInt(invoiceId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Invoice ID format.' });
    }

    try {
        const invoiceResult = await pool.query(`
            SELECT 
                i.InvoiceID, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.Amount, i.PaymentStatus, 
                c.CourseID, c.CourseNumber, c.DateScheduled AS DateCompleted, c.Location, c.StudentsRegistered, 
                ct.CourseTypeName,
                o.OrganizationID, o.OrganizationName, o.ContactName, o.ContactEmail, 
                o.AddressStreet, o.AddressCity, o.AddressProvince, o.AddressPostalCode,
                -- Calculate Attendance Count for this specific course
                (SELECT COUNT(*) FROM Students s WHERE s.CourseID = c.CourseID AND s.Attendance = TRUE) as studentsAttendance,
                -- Fetch the Rate applied when invoice was created (or current rate if not stored)
                ocp.Price as ratePerStudent
            FROM Invoices i
            JOIN Courses c ON i.CourseID = c.CourseID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            -- Get the pricing rule associated with the course
            LEFT JOIN OrganizationCoursePricing ocp ON c.OrganizationID = ocp.OrganizationID AND c.CourseTypeID = ocp.CourseTypeID 
            WHERE i.InvoiceID = $1
        `, [invoiceId]);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found.' });
        }

        const invoiceDetails = invoiceResult.rows[0];
        // Ensure numeric types are correctly parsed
        invoiceDetails.studentsattendance = parseInt(invoiceDetails.studentsattendance, 10);
        invoiceDetails.rateperstudent = invoiceDetails.rateperstudent ? parseFloat(invoiceDetails.rateperstudent) : null;
        invoiceDetails.amount = parseFloat(invoiceDetails.amount);

        console.log(`[API GET /accounting/invoices/${invoiceId}] Found invoice details.`);
        res.json({ success: true, invoice: invoiceDetails });

    } catch (err) {
        console.error(`[API GET /accounting/invoices/${invoiceId}] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch invoice details.' });
    }
});

// POST /api/accounting/invoices/:invoiceId/email - Send invoice via email
router.post('/invoices/:invoiceId/email', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { invoiceId } = req.params;
    console.log(`[API POST /accounting/invoices/${invoiceId}/email] Request received`);

    if (isNaN(parseInt(invoiceId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Invoice ID format.' });
    }

    let transporter;
    try {
        // 1. Initialize Email Transporter
        transporter = await createEtherealTransporter();
        if (!transporter) {
             throw new Error('Failed to initialize email service.');
        }

        // 2. Fetch Invoice Details (Including fields needed for PDF/email)
        const invoiceResult = await pool.query(`
             SELECT 
                i.InvoiceID, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.Amount, i.PaymentStatus, 
                c.CourseID, c.CourseNumber, c.DateScheduled AS DateCompleted, c.Location, 
                ct.CourseTypeName,
                o.OrganizationName, o.ContactName, o.ContactEmail,
                o.AddressStreet, o.AddressCity, o.AddressProvince, o.AddressPostalCode,
                (SELECT COUNT(*) FROM Students s WHERE s.CourseID = c.CourseID AND s.Attendance = TRUE) as studentsAttendance,
                ocp.Price as ratePerStudent
            FROM Invoices i
            JOIN Courses c ON i.CourseID = c.CourseID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN OrganizationCoursePricing ocp ON c.OrganizationID = ocp.OrganizationID AND c.CourseTypeID = ocp.CourseTypeID 
            WHERE i.InvoiceID = $1
        `, [invoiceId]);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found.' });
        }
        const invoiceDetails = invoiceResult.rows[0];
        // Parse numbers
        invoiceDetails.studentsattendance = parseInt(invoiceDetails.studentsattendance, 10);
        invoiceDetails.rateperstudent = invoiceDetails.rateperstudent ? parseFloat(invoiceDetails.rateperstudent) : null;
        invoiceDetails.amount = parseFloat(invoiceDetails.amount);

        if (!invoiceDetails.contactemail) {
             return res.status(400).json({ success: false, message: 'Organization contact email is missing. Cannot send invoice.' });
        }

        // 3. Fetch Student List for the associated course (for PDF breakdown)
        const studentsResult = await pool.query(
            'SELECT StudentID, FirstName, LastName, Email, Attendance FROM Students WHERE CourseID = $1 ORDER BY LastName, FirstName',
            [invoiceDetails.courseid]
        );
        invoiceDetails.students = studentsResult.rows; // Add students array to details
        console.log(`[API POST /email] Fetched ${invoiceDetails.students.length} students for course ${invoiceDetails.courseid}`);

        // 4. Generate Invoice PDF
        console.log('[API POST /email] Generating PDF...');
        const pdfBuffer = await generateInvoicePDF(invoiceDetails);
        console.log('[API POST /email] PDF Generated.');

        // 5. Send the email using the service with PDF attachment
        const emailResult = await sendInvoiceEmail(transporter, invoiceDetails, pdfBuffer);

        let responsePayload = { success: true, message: `Invoice ${invoiceDetails.invoicenumber} emailed successfully.` };
        if (emailResult.previewUrl) {
            responsePayload.previewUrl = emailResult.previewUrl; 
        }

        res.json(responsePayload);

    } catch (err) {
        console.error(`[API POST /accounting/invoices/${invoiceId}/email] Error:`, err);
        res.status(500).json({ success: false, message: err.message || 'Failed to send invoice email.' });
    }
});

module.exports = router; 