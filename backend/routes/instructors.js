const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Helper to get InstructorID from UserID
const getInstructorId = async (userId) => {
    try {
        const result = await pool.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (result.rows.length > 0) {
            return result.rows[0].instructorid;
        }
        return null;
    } catch (err) {
        console.error("Error fetching InstructorID for UserID:", userId, err);
        throw new Error("Failed to fetch instructor details."); // Propagate error
    }
};


// GET /api/instructor/classes - Fetch scheduled classes for the logged-in instructor
router.get('/classes', authenticateToken, async (req, res) => {
    if (!req.user) {
        console.error('[API GET /instructor/classes] Failed: req.user is missing after authenticateToken.');
        return res.status(401).json({ success: false, message: 'Authentication required or failed silently.' });
    }
    const userId = req.user.userid;
    console.log(`[API GET /instructor/classes] Request received for UserID: ${userId}`);

    try {
        const instructorId = await getInstructorId(userId);
        if (!instructorId) {
             console.warn(`[API GET /instructor/classes] No InstructorID found for UserID: ${userId}`);
             return res.status(403).json({ success: false, message: 'User is not an instructor.' });
        }
        console.log(`[API GET /instructor/classes] Found InstructorID: ${instructorId} for UserID: ${userId}`);

        // Fetch classes assigned to this instructor with status 'Scheduled'
        // Join with other tables to get necessary details like OrgName, CourseTypeName
        console.log(`[API GET /instructor/classes] Executing query for InstructorID: ${instructorId}`);
        const result = await pool.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.CourseNumber, c.DateRequested, c.DateScheduled, 
                c.Location, c.Status, c.Notes, c.StudentsRegistered,
                ct.CourseTypeName,
                o.OrganizationName,
                -- Calculate StudentsAttendance count (similar to org courses endpoint)
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as StudentsAttendance 
            FROM Courses c
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            LEFT JOIN Students s ON c.CourseID = s.CourseID 
            WHERE c.InstructorID = $1 AND c.Status = 'Scheduled'
            GROUP BY 
                c.CourseID, c.CreatedAt, c.CourseNumber, c.DateRequested, c.DateScheduled, c.Location, 
                c.Status, c.Notes, c.StudentsRegistered, ct.CourseTypeName, o.OrganizationName
            ORDER BY c.DateScheduled ASC
        `, [instructorId]);

        console.log(`[API GET /instructor/classes] DB query returned ${result.rows.length} rows for InstructorID: ${instructorId}`);
        // Log the actual rows if few, or just the count if many
        if (result.rows.length < 5) {
             console.log('[API GET /instructor/classes] Query Results:', JSON.stringify(result.rows, null, 2));
        } else {
            console.log(`[API GET /instructor/classes] First row (if exists):`, result.rows.length > 0 ? JSON.stringify(result.rows[0]) : 'N/A');
        }

        res.json({ success: true, classes: result.rows });

    } catch (err) {
        console.error(`[API GET /instructor/classes] Error fetching scheduled classes for UserID ${userId}:`, err);
        // Use the error message from getInstructorId if it was thrown
        if (err.message === "Failed to fetch instructor details.") {
             res.status(500).json({ success: false, message: err.message });
        } else {
             res.status(500).json({ success: false, message: 'Failed to fetch scheduled classes.' });
        }
    }
});

// TODO: Add routes for availability (GET, POST, DELETE /availability/:date?)
// TODO: Add route for today's classes (GET /todays-classes) - Reuse logic from server.js if needed
// TODO: Add route for completed classes (GET /completed-classes) - Reuse logic from server.js if needed

module.exports = router; 