const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Middleware to check for SuperAdmin role (can be moved to a shared middleware file later)
const checkSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Requires SuperAdmin privileges.' });
    }
    next();
};

// GET all users (SuperAdmin only)
router.get('/', authenticateToken, checkSuperAdmin, async (req, res) => {
    console.log('[API GET /users] Request received');
    try {
        // Select relevant user fields, potentially join with Organizations for OrgName
        const result = await pool.query(`
            SELECT u.UserID, u.Username, u.Role, u.FirstName, u.LastName, u.Email, u.Phone, u.OrganizationID, o.OrganizationName
            FROM Users u
            LEFT JOIN Organizations o ON u.OrganizationID = o.OrganizationID
            ORDER BY u.LastName, u.FirstName
        `);
        res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('[API GET /users] Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// POST a new user (SuperAdmin only)
router.post('/', authenticateToken, checkSuperAdmin, async (req, res) => {
    console.log('[API POST /users] Request received with body:', req.body);
    const {
        username, password, role, firstName, lastName, email, phone,
        organizationId // Required if role is 'Organization'
    } = req.body;

    // Validation
    if (!username || !password || !role || !firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'Missing required fields: username, password, role, firstName, lastName.' });
    }
    const allowedRoles = ['Instructor', 'Organization', 'Admin', 'Accounting', 'SuperAdmin'];
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }
    if (role === 'Organization' && !organizationId) {
        return res.status(400).json({ success: false, message: 'Organization ID is required for users with the Organization role.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert into Users table
        // Note: Storing plain text passwords is very insecure! Use hashing (e.g., bcrypt) in a real app.
        const userInsertResult = await client.query(
            `INSERT INTO Users (Username, Password, Role, FirstName, LastName, Email, Phone, OrganizationID)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING UserID`,
            [username, password, role, firstName, lastName, email, phone || null, role === 'Organization' ? organizationId : null]
        );
        const newUserId = userInsertResult.rows[0].userid;

        // If role is Instructor, insert into Instructors table
        if (role === 'Instructor') {
            await client.query(
                `INSERT INTO Instructors (UserID) VALUES ($1)`,
                [newUserId]
            );
            console.log(`[API POST /users] Instructor record created for UserID: ${newUserId}`);
        }

        await client.query('COMMIT');

        // Fetch the newly created user details (optional but good practice)
        const newUserResult = await pool.query('SELECT UserID, Username, Role, FirstName, LastName, Email, Phone, OrganizationID FROM Users WHERE UserID = $1', [newUserId]);

        console.log('[API POST /users] User created successfully:', newUserResult.rows[0]);
        res.status(201).json({ success: true, message: 'User created successfully.', user: newUserResult.rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[API POST /users] Error:', err);
        if (err.code === '23505') { // Unique constraint violation (username or email)
             return res.status(409).json({ success: false, message: `User creation failed: ${err.constraint === 'users_username_key' ? 'Username' : 'Email'} already exists.` });
        }
         if (err.code === '23503' && err.constraint === 'fk_organization') { // Foreign key violation
             return res.status(400).json({ success: false, message: 'Invalid Organization ID provided.'});
         }
        res.status(500).json({ success: false, message: 'Failed to create user' });
    } finally {
        client.release();
    }
});

// GET a single user by ID (SuperAdmin only)
router.get('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const userIdToFetch = parseInt(id, 10);
    console.log(`[API GET /users/${userIdToFetch}] Request received`);

    if (isNaN(userIdToFetch)) {
        return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
    }

    try {
        // Fetch user, join with org name if available
        const result = await pool.query(`
            SELECT u.UserID, u.Username, u.Role, u.FirstName, u.LastName, u.Email, u.Phone, u.OrganizationID, o.OrganizationName
            FROM Users u
            LEFT JOIN Organizations o ON u.OrganizationID = o.OrganizationID
            WHERE u.UserID = $1
        `, [userIdToFetch]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error(`[API GET /users/${userIdToFetch}] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

// PUT (update) a user by ID (SuperAdmin only)
router.put('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const userIdToUpdate = parseInt(id, 10);
    console.log(`[API PUT /users/${userIdToUpdate}] Request received with body:`, req.body);

    if (isNaN(userIdToUpdate)) {
        return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
    }

    // Extract updatable fields from request body
    const {
        username, password, role, firstName, lastName, email, phone,
        organizationId // Required if role is 'Organization'
    } = req.body;

    // Basic validation
    if (!username || !role || !firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'Missing required fields: username, role, firstName, lastName.' });
    }
    // Add more validation (email format, password complexity if not plain text, role validity etc.)
    const allowedRoles = ['Instructor', 'Organization', 'Admin', 'Accounting', 'SuperAdmin'];
     if (!allowedRoles.includes(role)) {
         return res.status(400).json({ success: false, message: 'Invalid role specified.' });
     }
     if (role === 'Organization' && !organizationId) {
         return res.status(400).json({ success: false, message: 'Organization ID is required for users with the Organization role.' });
     }
     // Prevent changing primary superadmin (ID 5) role or deleting them via role change
     if (userIdToUpdate === 5 && role !== 'SuperAdmin') {
          return res.status(403).json({ success: false, message: 'Cannot change the role of the primary superadmin user.'});
     }

    // **Password Handling Note:** Updating password requires hashing logic in a real app.
    // This implementation will store/update plain text password if provided.

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get current user details (needed for role change logic)
        const currentUserResult = await client.query('SELECT Role FROM Users WHERE UserID = $1', [userIdToUpdate]);
        if (currentUserResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const currentRole = currentUserResult.rows[0].role;

        // 2. Update Users table
        const userUpdateResult = await client.query(
            `UPDATE Users SET
                Username = $1, Role = $2, FirstName = $3, LastName = $4, Email = $5, Phone = $6,
                OrganizationID = $7, UpdatedAt = CURRENT_TIMESTAMP
                ${password ? ', Password = $9' : ''}
             WHERE UserID = $8
             RETURNING UserID`,
            password ? 
            [username, role, firstName, lastName, email, phone || null, role === 'Organization' ? organizationId : null, userIdToUpdate, password] :
            [username, role, firstName, lastName, email, phone || null, role === 'Organization' ? organizationId : null, userIdToUpdate]
        );

        if (userUpdateResult.rowCount === 0) {
            // Should not happen if current user check passed, but safety check
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'User not found during update.' });
        }

        // 3. Handle role change logic for Instructors
        if (currentRole !== 'Instructor' && role === 'Instructor') {
            // Role changed TO Instructor: Add record to Instructors table
            await client.query('INSERT INTO Instructors (UserID) VALUES ($1) ON CONFLICT (UserID) DO NOTHING', [userIdToUpdate]);
            console.log(`[API PUT /users/${userIdToUpdate}] Added Instructors record due to role change.`);
        } else if (currentRole === 'Instructor' && role !== 'Instructor') {
            // Role changed FROM Instructor: Remove record from Instructors table
            await client.query('DELETE FROM Instructors WHERE UserID = $1', [userIdToUpdate]);
            console.log(`[API PUT /users/${userIdToUpdate}] Removed Instructors record due to role change.`);
            // Also remove availability/classes if needed, though cascade might handle this now
            await client.query('DELETE FROM InstructorAvailability WHERE InstructorID = $1', [userIdToUpdate]);
            await client.query('DELETE FROM ScheduledClasses WHERE InstructorID = $1', [userIdToUpdate]);
        }

        await client.query('COMMIT');

        // Fetch updated user details
        const updatedUserResult = await pool.query('SELECT UserID, Username, Role, FirstName, LastName, Email, Phone, OrganizationID FROM Users WHERE UserID = $1', [userIdToUpdate]);

        console.log(`[API PUT /users/${userIdToUpdate}] User updated successfully:`, updatedUserResult.rows[0]);
        res.json({ success: true, message: 'User updated successfully.', user: updatedUserResult.rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API PUT /users/${userIdToUpdate}] Error:`, err);
        if (err.code === '23505') { // Unique constraint (username or email)
             return res.status(409).json({ success: false, message: `Update failed: ${err.constraint === 'users_username_key' ? 'Username' : 'Email'} already exists.` });
        }
        if (err.code === '23503' && err.constraint === 'fk_organization') { // Invalid Org ID
             return res.status(400).json({ success: false, message: 'Invalid Organization ID provided.'});
        }
        res.status(500).json({ success: false, message: 'Failed to update user' });
    } finally {
        client.release();
    }
});

// DELETE a user (SuperAdmin only)
router.delete('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const userIdToDelete = parseInt(id, 10);
    console.log(`[API DELETE /users/${userIdToDelete}] Request received`);

    if (isNaN(userIdToDelete)) {
        return res.status(400).json({ success: false, message: 'Invalid User ID format.' });
    }

    // Prevent deleting the default superadmin (ID 5)
    if (userIdToDelete === 5) { 
        return res.status(403).json({ success: false, message: 'Cannot delete the primary superadmin user.'});
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get the user's role to check if they are an instructor
        const userRoleResult = await client.query('SELECT Role FROM Users WHERE UserID = $1', [userIdToDelete]);
        if (userRoleResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        const userRole = userRoleResult.rows[0].role;

        // 2. If user is an instructor, delete from Instructors table first
        if (userRole === 'Instructor') {
            // We might need ON DELETE CASCADE on Courses.InstructorID if we don't handle course reassignment
            // For now, we just delete the instructor record itself.
            const instructorDeleteResult = await client.query('DELETE FROM Instructors WHERE UserID = $1', [userIdToDelete]);
            console.log(`[API DELETE /users/${userIdToDelete}] Instructor record deletion attempt result (rowCount): ${instructorDeleteResult.rowCount}`);
            // We proceed even if no instructor record was found, as the user might exist without one
        }

        // 3. Delete associated availability and scheduled classes (if using those tables directly)
        // These might be covered by ON DELETE CASCADE if set up on Users(UserID) FKs
        // Let's add explicit deletes just in case cascade isn't fully set on those yet
        await client.query('DELETE FROM InstructorAvailability WHERE InstructorID = $1', [userIdToDelete]);

        // 4. Delete the user from Users table
        // Note: Courses referencing this user (if OrgAdmin/Instructor) might need handling
        // ON DELETE SET NULL or preventing deletion might be needed on Courses.OrganizationID/InstructorID if cascade isn't used there.
        const userDeleteResult = await client.query('DELETE FROM Users WHERE UserID = $1 RETURNING UserID', [userIdToDelete]);

        if (userDeleteResult.rowCount === 0) {
            // This shouldn't happen if the role check found the user, but good practice
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'User not found during final delete step.' });
        }

        await client.query('COMMIT');
        console.log(`[API DELETE /users/${userIdToDelete}] User deleted successfully.`);
        res.json({ success: true, message: `User ${userIdToDelete} deleted successfully.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API DELETE /users/${userIdToDelete}] Error:`, err);
        // Check for foreign key violations if other tables still reference the user
        // This indicates missing ON DELETE CASCADE or ON DELETE SET NULL on related tables
        if (err.code === '23503') { 
             console.error(`[API DELETE /users/${userIdToDelete}] Foreign key violation:`, err.detail);
             return res.status(409).json({ success: false, message: `Cannot delete user: Still referenced by other records (e.g., Courses). Details: ${err.detail}` });
        }
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    } finally {
        client.release();
    }
});

module.exports = router; 