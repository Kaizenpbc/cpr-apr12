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
        // Fetch necessary fields, join Payments table, calculate paid amount
        const result = await pool.query(`
            SELECT 
                i.InvoiceID, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.Amount, i.PaymentStatus, 
                c.CourseNumber, 
                o.OrganizationName,
                o.OrganizationID, 
                i.EmailSentAt,
                -- Calculate total paid amount for each invoice
                COALESCE((SELECT SUM(p.AmountPaid) FROM Payments p WHERE p.InvoiceID = i.InvoiceID), 0) as "paidToDate"
            FROM Invoices i
            JOIN Courses c ON i.CourseID = c.CourseID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            ORDER BY i.InvoiceDate DESC 
        `);
        
        const invoices = result.rows;
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        // Calculate aging bucket and balance due for each invoice
        const invoicesWithDetails = invoices.map(invoice => {
            let agingBucket = 'Paid'; 
            const invoiceAmount = parseFloat(invoice.amount || 0);
            const paidToDate = parseFloat(invoice.paidToDate || 0); // Use the value from the query
            const balanceDue = invoiceAmount - paidToDate;

            if (invoice.paymentstatus?.toLowerCase() !== 'paid') {
                try {
                    const dueDate = new Date(invoice.duedate);
                    dueDate.setHours(0, 0, 0, 0); // Normalize due date
                    
                    if (dueDate >= today) {
                        agingBucket = 'Current';
                    } else {
                        // Calculate difference in milliseconds and convert to days
                        const diffTime = today - dueDate; 
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days past due
                        
                        if (diffDays <= 30) {
                            agingBucket = '1-30 Days';
                        } else if (diffDays <= 60) {
                            agingBucket = '31-60 Days';
                        } else if (diffDays <= 90) {
                            agingBucket = '61-90 Days';
                        } else {
                            agingBucket = '90+ Days';
                        }
                    }
                } catch (e) {
                    console.error(`Error processing date for aging calculation on invoice ${invoice.invoiceid}:`, e);
                    agingBucket = 'Error'; // Indicate date processing error
                }
            }
            // Return object including calculated fields
            return { 
                ...invoice, 
                paidToDate: paidToDate, // Ensure it's included
                balanceDue: balanceDue,
                agingBucket: agingBucket
            }; 
        });

        console.log('[API GET /accounting/invoices] Returning invoices with aging and payment details.');
        res.json({ success: true, invoices: invoicesWithDetails }); // Send modified array

    } catch (err) {
        // Add check for Payments table not existing in catch block too
         if (err.code === '42P01') { 
            console.warn(`[API GET /invoices] Payments table likely does not exist yet. Error: ${err.message}. Returning invoices without payment data.`);
            // Try to return data without payment info if Payments table fails
            try {
                 const result = await pool.query(`
                    SELECT 
                        i.InvoiceID, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.Amount, i.PaymentStatus, 
                        c.CourseNumber, o.OrganizationName, o.OrganizationID, i.EmailSentAt
                    FROM Invoices i
                    JOIN Courses c ON i.CourseID = c.CourseID
                    JOIN Organizations o ON c.OrganizationID = o.OrganizationID
                    ORDER BY i.InvoiceDate DESC 
                 `);
                 // Calculate aging, assume paidToDate is 0
                  const invoices = result.rows;
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const invoicesWithAging = invoices.map(invoice => { /* ... aging logic ... */ 
                       const invoiceAmount = parseFloat(invoice.amount || 0);
                       return { ...invoice, paidToDate: 0, balanceDue: invoiceAmount, agingBucket };
                  });
                 res.json({ success: true, invoices: invoicesWithAging });
            } catch (fallbackErr) {
                console.error("[API GET /accounting/invoices] Error during fallback query:", fallbackErr);
                res.status(500).json({ success: false, message: 'Failed to fetch invoices.' });
            }
        } else {
            console.error("[API GET /accounting/invoices] Error:", err);
            res.status(500).json({ success: false, message: 'Failed to fetch invoices.' });
        }
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

        // 6. Update Invoice record to mark email as sent
        try {
            await pool.query(
                'UPDATE Invoices SET EmailSentAt = CURRENT_TIMESTAMP WHERE InvoiceID = $1',
                [invoiceId]
            );
            console.log(`[API POST /email] Updated EmailSentAt for Invoice ID: ${invoiceId}`);
        } catch (updateError) {
            // Log the error but don't fail the whole request if email was sent
            console.error(`[API POST /email] Failed to update EmailSentAt for Invoice ID: ${invoiceId}`, updateError);
        }

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

// GET /api/accounting/invoices/:invoiceId/payments - Fetch payment history for an invoice
router.get('/invoices/:invoiceId/payments', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { invoiceId } = req.params;
    console.log(`[API GET /accounting/invoices/${invoiceId}/payments] Request received`);

    if (isNaN(parseInt(invoiceId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Invoice ID format.' });
    }

    try {
        // Query the new Payments table
        const paymentResult = await pool.query(`
            SELECT 
                PaymentID, PaymentDate, AmountPaid, PaymentMethod, ReferenceNumber, Notes, RecordedAt
            FROM Payments
            WHERE InvoiceID = $1
            ORDER BY PaymentDate ASC, RecordedAt ASC -- Order by date, then time recorded
        `, [invoiceId]);

        console.log(`[API GET /accounting/invoices/${invoiceId}/payments] Found ${paymentResult.rows.length} payments.`);
        res.json({ success: true, payments: paymentResult.rows });

    } catch (err) {
        // Check specifically if the error is because the Payments table doesn't exist yet
        if (err.code === '42P01') { // undefined_table error code in PostgreSQL
            console.warn(`[API GET /payments] Payments table likely does not exist yet. Error: ${err.message}`);
            // Return success with empty array, assuming table will be created
            // Alternatively, return a specific error message if preferred.
            return res.json({ success: true, payments: [] }); 
        } else {
            console.error(`[API GET /accounting/invoices/${invoiceId}/payments] Error:`, err);
            res.status(500).json({ success: false, message: 'Failed to fetch payment history.' });
        }
    }
});

// POST /api/accounting/invoices/:invoiceId/payments - Record a new payment
router.post('/invoices/:invoiceId/payments', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { invoiceId } = req.params;
    const { paymentDate, amountPaid, paymentMethod, referenceNumber, notes } = req.body;
    console.log(`[API POST /accounting/invoices/${invoiceId}/payments] Request received`, req.body);

    // Validate input
    if (isNaN(parseInt(invoiceId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Invoice ID format.' });
    }
    if (!paymentDate || isNaN(parseFloat(amountPaid)) || parseFloat(amountPaid) <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment date or amount provided.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch original invoice amount and current status
        const invoiceRes = await client.query(
            'SELECT Amount, PaymentStatus FROM Invoices WHERE InvoiceID = $1 FOR UPDATE', // Lock row
            [invoiceId]
        );
        if (invoiceRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Invoice not found.' });
        }
        if (invoiceRes.rows[0].paymentstatus === 'Paid') {
             await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invoice is already marked as paid.' });
        }
        const invoiceAmount = parseFloat(invoiceRes.rows[0].amount);

        // 2. Insert the new payment record
        await client.query(`
            INSERT INTO Payments (InvoiceID, PaymentDate, AmountPaid, PaymentMethod, ReferenceNumber, Notes)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [invoiceId, paymentDate, amountPaid, paymentMethod || null, referenceNumber || null, notes || null]);
        console.log(`[Record Payment] Inserted payment record for Invoice ID: ${invoiceId}`);

        // 3. Calculate new total paid amount
        const totalPaidRes = await client.query(
            'SELECT SUM(AmountPaid) as total FROM Payments WHERE InvoiceID = $1',
            [invoiceId]
        );
        const totalPaid = parseFloat(totalPaidRes.rows[0].total || 0);
        console.log(`[Record Payment] New total paid for Invoice ID ${invoiceId}: ${totalPaid}`);

        // 4. Update Invoice status if fully paid
        let newStatus = invoiceRes.rows[0].paymentstatus; // Keep current status unless paid
        if (totalPaid >= invoiceAmount) {
            newStatus = 'Paid';
            await client.query(
                'UPDATE Invoices SET PaymentStatus = $1, UpdatedAt = CURRENT_TIMESTAMP WHERE InvoiceID = $2',
                [newStatus, invoiceId]
            );
            console.log(`[Record Payment] Invoice ID ${invoiceId} status updated to Paid.`);
        }

        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Payment recorded successfully.', newStatus: newStatus });

    } catch (err) {
        await client.query('ROLLBACK');
        // Check if error is due to Payments table not existing
        if (err.code === '42P01') { 
            console.error(`[Record Payment] Error: Payments table likely does not exist yet. ${err.message}`);
            return res.status(500).json({ success: false, message: 'Database setup incomplete: Payments table missing.' });
        } else {
            console.error(`[API POST /accounting/invoices/${invoiceId}/payments] Error:`, err);
            res.status(500).json({ success: false, message: 'Failed to record payment.' });
        }
    } finally {
        client.release();
    }
});

// --- Organization Detail Viewpoints ---

// GET /api/accounting/organizations/:orgId/details - Fetch basic org info
router.get('/organizations/:orgId/details', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { orgId } = req.params;
    console.log(`[API GET /accounting/organizations/${orgId}/details] Request received`);

    if (isNaN(parseInt(orgId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    try {
        const result = await pool.query(
            `SELECT OrganizationID, OrganizationName, ContactName, ContactEmail, ContactPhone, 
                    AddressStreet, AddressCity, AddressProvince, AddressPostalCode 
             FROM organizations 
             WHERE OrganizationID = $1`,
            [orgId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        res.json({ success: true, details: result.rows[0] });

    } catch (err) {
        console.error(`[API GET /accounting/organizations/${orgId}/details] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch organization details.' });
    }
});

// GET /api/accounting/organizations/:orgId/courses - Fetch all courses for an org
router.get('/organizations/:orgId/courses', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { orgId } = req.params;
    // Optional: Add filtering based on query params like ?status=Scheduled or ?startDate=...&endDate=...
    console.log(`[API GET /accounting/organizations/${orgId}/courses] Request received`);

    if (isNaN(parseInt(orgId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    try {
        // Query similar to the one used in OrganizationPortal, but without status filter initially
        const result = await pool.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.CourseNumber, c.DateRequested, c.DateScheduled, 
                c.Location, c.Status, c.Notes, c.StudentsRegistered,
                ct.CourseTypeName,
                o.OrganizationName, -- Already know OrgID, but include for consistency
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
                -- Calculate StudentsAttendance count
                (SELECT COUNT(*) FROM Students s WHERE s.CourseID = c.CourseID AND s.Attendance = TRUE) as studentsattendance
            FROM Courses c
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            WHERE c.OrganizationID = $1
            ORDER BY c.DateRequested DESC -- Or DateScheduled, or Status
        `, [orgId]);
        
        // Parse count
        const courses = result.rows.map(course => ({
            ...course,
            studentsattendance: parseInt(course.studentsattendance, 10)
        }));

        res.json({ success: true, courses: courses });
    } catch (err) {
        console.error(`[API GET /accounting/organizations/${orgId}/courses] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch organization courses.' });
    }
});

// GET /api/accounting/organizations/:orgId/invoices - Fetch all invoices for an org
router.get('/organizations/:orgId/invoices', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { orgId } = req.params;
    console.log(`[API GET /accounting/organizations/${orgId}/invoices] Request received`);

     if (isNaN(parseInt(orgId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    try {
        // Query similar to GET /invoices, but filtered by OrganizationID
        const result = await pool.query(`
            SELECT 
                i.InvoiceID, i.InvoiceNumber, i.InvoiceDate, i.DueDate, i.Amount, i.PaymentStatus, 
                c.CourseNumber, 
                o.OrganizationName,
                o.OrganizationID,
                i.EmailSentAt
            FROM Invoices i
            JOIN Courses c ON i.CourseID = c.CourseID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            WHERE o.OrganizationID = $1 -- Filter by Org ID
            ORDER BY i.InvoiceDate DESC
        `, [orgId]);
        
        const invoices = result.rows; // Already includes aging calculation from general endpoint logic? NO - need to add it here too.
        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        // Calculate aging bucket for each invoice FOR THIS ORG
        const invoicesWithAging = invoices.map(invoice => {
            let agingBucket = 'Paid'; 
            if (invoice.paymentstatus?.toLowerCase() !== 'paid') {
                try {
                    const dueDate = new Date(invoice.duedate);
                    dueDate.setHours(0, 0, 0, 0); 
                    if (dueDate >= today) {
                        agingBucket = 'Current';
                    } else {
                        const diffTime = today - dueDate; 
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays <= 30) agingBucket = '1-30 Days';
                        else if (diffDays <= 60) agingBucket = '31-60 Days';
                        else if (diffDays <= 90) agingBucket = '61-90 Days';
                        else agingBucket = '90+ Days';
                    }
                } catch (e) {
                     agingBucket = 'Error'; 
                }
            }
            return { ...invoice, agingBucket };
        });

        res.json({ success: true, invoices: invoicesWithAging });

    } catch (err) {
        console.error(`[API GET /accounting/organizations/${orgId}/invoices] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch organization invoices.' });
    }
});

// GET /api/accounting/organizations/:orgId/payments - Fetch all payments for an org
router.get('/organizations/:orgId/payments', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { orgId } = req.params;
    console.log(`[API GET /accounting/organizations/${orgId}/payments] Request received`);

     if (isNaN(parseInt(orgId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    try {
        // Query Payments, joining through Invoices and Courses to filter by OrgID
        const paymentResult = await pool.query(`
            SELECT 
                p.PaymentID, p.PaymentDate, p.AmountPaid, p.PaymentMethod, p.ReferenceNumber, p.Notes, p.RecordedAt,
                i.InvoiceNumber, c.CourseNumber
            FROM Payments p
            JOIN Invoices i ON p.InvoiceID = i.InvoiceID
            JOIN Courses c ON i.CourseID = c.CourseID
            WHERE c.OrganizationID = $1
            ORDER BY p.PaymentDate DESC, p.RecordedAt DESC 
        `, [orgId]);

        console.log(`[API GET /accounting/organizations/${orgId}/payments] Found ${paymentResult.rows.length} payments.`);
        res.json({ success: true, payments: paymentResult.rows });

    } catch (err) {
        if (err.code === '42P01') { // Payments table might not exist yet
            console.warn(`[API GET /org-payments] Payments table likely does not exist yet. Error: ${err.message}`);
            return res.json({ success: true, payments: [] }); 
        } else {
            console.error(`[API GET /accounting/organizations/${orgId}/payments] Error:`, err);
            res.status(500).json({ success: false, message: 'Failed to fetch organization payment history.' });
        }
    }
});

// GET /api/accounting/organizations/:orgId/financial-summary - Calculate financial totals for an org
router.get('/organizations/:orgId/financial-summary', authenticateToken, checkAccountingAccess, async (req, res) => {
    const { orgId } = req.params;
    console.log(`[API GET /accounting/organizations/${orgId}/financial-summary] Request received`);

     if (isNaN(parseInt(orgId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    try {
        // Calculate total invoiced amount
        const invoicedRes = await pool.query(`
            SELECT COALESCE(SUM(i.Amount), 0) as totalInvoiced
            FROM Invoices i
            JOIN Courses c ON i.CourseID = c.CourseID
            WHERE c.OrganizationID = $1
        `, [orgId]);
        const totalInvoiced = parseFloat(invoicedRes.rows[0].totalinvoiced);

        // Calculate total paid amount
        const paidRes = await pool.query(`
            SELECT COALESCE(SUM(p.AmountPaid), 0) as totalPaid
            FROM Payments p
            JOIN Invoices i ON p.InvoiceID = i.InvoiceID
            JOIN Courses c ON i.CourseID = c.CourseID
            WHERE c.OrganizationID = $1
        `, [orgId]);
        const totalPaid = parseFloat(paidRes.rows[0].totalpaid);

        const balanceDue = totalInvoiced - totalPaid;

        const summary = {
            totalInvoiced: totalInvoiced,
            totalPaid: totalPaid,
            balanceDue: balanceDue
        };
        console.log(`[API GET /accounting/organizations/${orgId}/financial-summary] Summary:`, summary);
        res.json({ success: true, summary: summary });

    } catch (err) {
         if (err.code === '42P01') { // Payments table might not exist yet
            console.warn(`[API GET /org-summary] Payments table likely does not exist yet. Error: ${err.message}. Returning 0 paid.`);
            // Try to return invoiced amount at least
            try {
                const invoicedRes = await pool.query(`SELECT COALESCE(SUM(i.Amount), 0) as totalInvoiced FROM Invoices i JOIN Courses c ON i.CourseID = c.CourseID WHERE c.OrganizationID = $1`, [orgId]);
                const totalInvoiced = parseFloat(invoicedRes.rows[0].totalinvoiced);
                 res.json({ success: true, summary: { totalInvoiced: totalInvoiced, totalPaid: 0, balanceDue: totalInvoiced } });
            } catch (innerErr) {
                 console.error(`[API GET /accounting/organizations/${orgId}/financial-summary] Error even fetching invoiced amount:`, innerErr);
                 res.status(500).json({ success: false, message: 'Failed to fetch organization financial summary.' });
            }
        } else {
            console.error(`[API GET /accounting/organizations/${orgId}/financial-summary] Error:`, err);
            res.status(500).json({ success: false, message: 'Failed to fetch organization financial summary.' });
        }
    }
});

module.exports = router; 