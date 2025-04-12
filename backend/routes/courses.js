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

// PUT /api/courses/:courseId/cancel (Admin/SuperAdmin)
router.put('/:courseId/cancel', authenticateToken, checkAdminAccess, async (req, res) => {
    const { courseId } = req.params;
    console.log(`[API PUT /courses/${courseId}/cancel] Request received by User ${req.user.userid}`);

    if (isNaN(parseInt(courseId, 10))) {
         return res.status(400).json({ success: false, message: 'Invalid Course ID format.' });
     }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch course details to check status and get related IDs
        const courseResult = await client.query(
            'SELECT Status, InstructorID, OrganizationID, CourseNumber FROM Courses WHERE CourseID = $1',
            [courseId]
        );

        if (courseResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Course not found.' });
        }

        const course = courseResult.rows[0];
        if (course.status !== 'Pending' && course.status !== 'Scheduled') {
            await client.query('ROLLBACK');
            return res.status(400).json({ 
                success: false, 
                message: `Cannot cancel course with status '${course.status}'. Only Pending or Scheduled courses can be cancelled.` 
            });
        }

        // 2. Update Course Status to 'Cancelled'
        const updateResult = await client.query(
            `UPDATE Courses SET Status = 'Cancelled', UpdatedAt = CURRENT_TIMESTAMP 
             WHERE CourseID = $1 RETURNING InstructorID, OrganizationID, CourseNumber`, 
            [courseId]
        );
        
        const updatedCourseInfo = updateResult.rows[0];

        // --- Socket Emission Removed (Needs Refactor) ---
        console.log(`[Cancel Course] Course ${courseId} status updated to Cancelled.`);
        // --- End Socket Emission ---
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Course cancelled successfully.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error cancelling course ${courseId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to cancel course.' });
    } finally {
        client.release();
    }
});

// Mark a course as ready for billing
router.put('/:courseId/billing-ready', authenticateToken, checkAdminAccess, async (req, res) => {
    const { courseId } = req.params;
    console.log(`[API PUT /courses/${courseId}/billing-ready] Request received`);

    if (isNaN(parseInt(courseId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Course ID format.' });
    }

    try {
        // 1. Get Course OrgID and CourseTypeID to check for pricing rule
        const courseInfoRes = await pool.query(
            'SELECT OrganizationID, CourseTypeID FROM Courses WHERE CourseID = $1 AND Status = \'Completed\'', 
            [courseId]
        );

        if (courseInfoRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Completed course not found or already marked for billing.' });
        }
        const { organizationid, coursetypeid } = courseInfoRes.rows[0];

        // 2. Check if a pricing rule exists for this Org/CourseType combination
        const pricingRuleRes = await pool.query(
            'SELECT 1 FROM OrganizationCoursePricing WHERE OrganizationID = $1 AND CourseTypeID = $2',
            [organizationid, coursetypeid]
        );

        if (pricingRuleRes.rowCount === 0) {
            console.warn(`[API PUT /courses/${courseId}/billing-ready] Failed: No pricing rule found for Org ${organizationid}, CourseType ${coursetypeid}`);
            return res.status(400).json({ success: false, message: 'Cannot mark ready for billing: No pricing rule exists for this organization and course type. Please add one in Super Admin -> Pricing Rules.' });
        }

        // 3. If rule exists, update the course status
        console.log(`[API PUT /courses/${courseId}/billing-ready] Pricing rule found. Updating status...`);
        const updateResult = await pool.query(
            `UPDATE Courses SET Status = 'Billing Ready', UpdatedAt = CURRENT_TIMESTAMP
             WHERE CourseID = $1 AND Status = 'Completed' RETURNING *`,
            [courseId]
        );

        if (updateResult.rowCount === 0) {
             // Should not happen if first query succeeded, but safety check
            return res.status(404).json({ success: false, message: 'Course status could not be updated. It might have changed since the initial check.' });
        }

        console.log(`[API PUT /courses/${courseId}/billing-ready] Status updated successfully.`);
        res.json({ success: true, message: 'Course marked ready for billing.', course: updateResult.rows[0] });

    } catch (err) {
        console.error(`[API PUT /courses/${courseId}/billing-ready] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to mark course ready for billing.' });
    }
});

// Add other course-specific routes here later (e.g., GET /:id, POST, PUT /:id etc. if needed)

module.exports = router; 