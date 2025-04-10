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

// --- Availability Routes (Moved from server.js) ---

// GET /api/instructor/availability - Fetch *truly* available dates
router.get('/availability', authenticateToken, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const userId = req.user.userid;
    console.log(`[API GET /instructor/availability] Request received for UserID: ${userId}`);

    try {
        const instructorId = await getInstructorId(userId);
        if (!instructorId) {
            return res.status(403).json({ success: false, message: 'User is not an instructor.' });
        }

        // 1. Fetch all dates marked available by instructor
        const availabilityResult = await pool.query(
            'SELECT AvailableDate FROM InstructorAvailability WHERE InstructorID = $1',
            [instructorId]
        );
        const availableDates = availabilityResult.rows.map(row => row.availabledate);
        console.log(`[API GET /instructor/availability] Found ${availableDates.length} raw available dates for InstructorID: ${instructorId}`);

        // 2. Fetch all dates where this instructor has a scheduled OR completed course
        const courseDatesResult = await pool.query(
            `SELECT DISTINCT TO_CHAR(DateScheduled, 'YYYY-MM-DD') as scheduled_date 
             FROM Courses 
             WHERE InstructorID = $1 AND Status IN ('Scheduled', 'Completed') AND DateScheduled IS NOT NULL`,
            [instructorId]
        );
        const courseDatesSet = new Set(courseDatesResult.rows.map(row => row.scheduled_date));
        console.log(`[API GET /instructor/availability] Found ${courseDatesSet.size} course dates for InstructorID: ${instructorId}:`, courseDatesSet);

        // 3. Filter available dates: keep only those NOT matching a course date
        const trulyAvailableDates = availableDates.filter(date => {
            try {
                const dateStr = new Date(date).toISOString().split('T')[0];
                return !courseDatesSet.has(dateStr);
            } catch (e) {
                console.error('Error parsing date during availability filtering:', date, e);
                return false; // Exclude potentially invalid dates
            }
        });

        console.log(`[API GET /instructor/availability] Returning ${trulyAvailableDates.length} truly available dates for InstructorID: ${instructorId}`);
        // Return the array of date strings as before
        res.json(trulyAvailableDates);

    } catch (err) {
        console.error(`[API GET /instructor/availability] Error fetching availability for UserID ${userId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch availability' });
    }
});

// POST /api/instructor/availability - Add an availability date
router.post('/availability', authenticateToken, async (req, res) => {
     if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const userId = req.user.userid;
    const { date } = req.body;
    console.log(`[API POST /instructor/availability] Request received for UserID: ${userId}, Date: ${date}`);

    if (!date) {
        return res.status(400).json({ success: false, message: 'Date is required.' });
    }

    try {
        const instructorId = await getInstructorId(userId);
        if (!instructorId) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }

        await pool.query(
            'INSERT INTO InstructorAvailability (InstructorID, AvailableDate) VALUES ($1, $2) ON CONFLICT (InstructorID, AvailableDate) DO NOTHING', // Prevent duplicates
            [instructorId, date]
        );
        console.log(`[API POST /instructor/availability] Availability added/confirmed for InstructorID: ${instructorId}, Date: ${date}`);
        res.status(201).json({ success: true, message: 'Availability added successfully' });

    } catch (error) {
        console.error(`[API POST /instructor/availability] Error for UserID ${userId}, Date ${date}:`, error);
        // Avoid sending generic 409 for other errors
        if (error.code === '23505') { // Should be handled by ON CONFLICT now, but keep as safety
             res.status(409).json({ success: false, message: 'Date already marked as available' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to add availability' });
        }
    }
});

// DELETE /api/instructor/availability/:date - Remove an availability date
router.delete('/availability/:date', authenticateToken, async (req, res) => {
     if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const userId = req.user.userid;
    const { date } = req.params;
    console.log(`[API DELETE /instructor/availability] Request received for UserID: ${userId}, Date: ${date}`);

    if (!date) {
        return res.status(400).json({ success: false, message: 'Date parameter is required.' });
    }

    try {
        const instructorId = await getInstructorId(userId);
        if (!instructorId) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }

        const deleteResult = await pool.query(
            'DELETE FROM InstructorAvailability WHERE InstructorID = $1 AND AvailableDate = $2',
            [instructorId, date]
        );
        console.log(`[API DELETE /instructor/availability] Delete result for InstructorID ${instructorId}, Date ${date}:`, deleteResult.rowCount);

        if (deleteResult.rowCount > 0) {
            res.json({ success: true, message: 'Availability removed successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Availability date not found for this instructor' });
        }
    } catch (error) {
        console.error(`[API DELETE /instructor/availability] Error for UserID ${userId}, Date ${date}:`, error);
        res.status(500).json({ success: false, message: 'Failed to remove availability' });
    }
});


// --- Other Instructor Routes --- 
// TODO: Move routes for today's classes (GET /todays-classes) from server.js if desired
// TODO: Move route for completed classes (GET /completed-classes) from server.js if desired

module.exports = router; 