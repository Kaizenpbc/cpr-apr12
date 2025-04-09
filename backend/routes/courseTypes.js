const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Middleware to check for SuperAdmin role (Consider moving to shared location)
const checkSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Requires SuperAdmin privileges.' });
    }
    next();
};

// GET all course types (Accessible to relevant roles - adjust as needed, maybe allow all authenticated?)
// For now, let's keep it open to any authenticated user needing the list.
router.get('/', authenticateToken, async (req, res) => {
    if (!req.user) { // Check if token was valid even if role doesn't matter for GET
         return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    console.log('[API GET /course-types] Request received');
    try {
        const result = await pool.query('SELECT * FROM CourseTypes ORDER BY CourseTypeName');
        res.json({ success: true, courseTypes: result.rows });
    } catch (err) {
        console.error('[API GET /course-types] Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch course types' });
    }
});

// POST a new course type (SuperAdmin only)
router.post('/', authenticateToken, checkSuperAdmin, async (req, res) => {
    console.log('[API POST /course-types] Request received with body:', req.body);
    const { coursetypename, coursecode, description, duration, maxstudents } = req.body;

    if (!coursetypename || !coursecode) {
        return res.status(400).json({ success: false, message: 'Course Type Name and Code are required.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO CourseTypes (CourseTypeName, CourseCode, Description, Duration, MaxStudents)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [coursetypename, coursecode, description, duration, maxstudents]
        );
        res.status(201).json({ success: true, message: 'Course Type created.', courseType: result.rows[0] });
    } catch (err) {
        console.error('[API POST /course-types] Error:', err);
        if (err.code === '23505') { // Unique constraint violation
             return res.status(409).json({ success: false, message: `Creation failed: ${err.constraint === 'coursetypes_coursetypename_key' ? 'Name' : 'Code'} already exists.` });
        }
        res.status(500).json({ success: false, message: 'Failed to create course type' });
    }
});

// PUT (update) a course type (SuperAdmin only)
router.put('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { coursetypename, coursecode, description, duration, maxstudents } = req.body;
    console.log(`[API PUT /course-types/${id}] Request received with body:`, req.body);

     if (!coursetypename || !coursecode) {
        return res.status(400).json({ success: false, message: 'Course Type Name and Code are required.' });
    }
     if (isNaN(parseInt(id, 10))) {
         return res.status(400).json({ success: false, message: 'Invalid Course Type ID format.' });
     }

    try {
        const result = await pool.query(
            `UPDATE CourseTypes SET 
                CourseTypeName = $1, CourseCode = $2, Description = $3, 
                Duration = $4, MaxStudents = $5, UpdatedAt = CURRENT_TIMESTAMP
             WHERE CourseTypeID = $6 RETURNING *`,
            [coursetypename, coursecode, description, duration, maxstudents, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Course Type not found.' });
        }
        res.json({ success: true, message: 'Course Type updated.', courseType: result.rows[0] });
    } catch (err) {
        console.error(`[API PUT /course-types/${id}] Error:`, err);
         if (err.code === '23505') { // Unique constraint violation
             return res.status(409).json({ success: false, message: `Update failed: ${err.constraint === 'coursetypes_coursetypename_key' ? 'Name' : 'Code'} already exists.` });
        }
        res.status(500).json({ success: false, message: 'Failed to update course type' });
    }
});

// DELETE a course type (SuperAdmin only)
router.delete('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`[API DELETE /course-types/${id}] Request received`);
    
    if (isNaN(parseInt(id, 10))) {
         return res.status(400).json({ success: false, message: 'Invalid Course Type ID format.' });
     }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Check if any courses reference this type
        const courseCheck = await client.query('SELECT 1 FROM Courses WHERE CourseTypeID = $1 LIMIT 1', [id]);
        if (courseCheck.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Cannot delete: Course Type is referenced by existing courses.' });
        }
        // Delete if no references found
        const result = await client.query('DELETE FROM CourseTypes WHERE CourseTypeID = $1 RETURNING CourseTypeID', [id]);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Course Type not found.' });
        }
        await client.query('COMMIT');
        res.json({ success: true, message: `Course Type ${id} deleted.` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API DELETE /course-types/${id}] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to delete course type' });
    } finally {
        client.release();
    }
});

module.exports = router; 