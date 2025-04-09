const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Middleware to check for Admin or SuperAdmin role
const checkAdminAccess = (req, res, next) => {
    if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin')) {
        return res.status(403).json({ success: false, message: 'Forbidden: Requires Admin or SuperAdmin privileges.' });
    }
    next();
};

// PUT /api/courses/:courseId/ready-for-billing 
// (Note: Route path starts after the base '/api/courses' defined in server.js)
router.put('/:courseId/ready-for-billing', authenticateToken, checkAdminAccess, async (req, res) => {
    const { courseId } = req.params;
    console.log(`[API PUT /courses/${courseId}/ready-for-billing] Request received`);

    if (isNaN(parseInt(courseId, 10))) {
         return res.status(400).json({ success: false, message: 'Invalid Course ID format.' });
     }

    try {
        const result = await pool.query(
            `UPDATE Courses SET Status = 'Billing Ready', UpdatedAt = CURRENT_TIMESTAMP 
             WHERE CourseID = $1 AND Status = 'Completed' 
             RETURNING CourseID`, // Return ID to confirm update
            [courseId]
        );

        if (result.rowCount === 0) {
            // Course might not exist, not be 'Completed', or already flagged
            return res.status(404).json({ success: false, message: 'Completed course not found or could not be marked for billing.' });
        }

        res.json({ success: true, message: 'Course marked as ready for billing.' });

    } catch (err) {
        console.error(`Error marking course ${courseId} ready for billing:`, err);
        res.status(500).json({ success: false, message: 'Failed to mark course ready for billing.' });
    }
});

// Add other course-specific routes here later (e.g., GET /:id, POST, PUT /:id etc. if needed)

module.exports = router; 