const express = require('express');
const { pool } = require('../db'); // Assuming db setup exports pool
const authenticateToken = require('../middleware/authenticateToken'); // Assuming middleware exists

const router = express.Router();

// Middleware to check for SuperAdmin role
const checkSuperAdmin = (req, res, next) => {
    // This assumes authenticateToken middleware runs first and adds req.user
    if (!req.user || req.user.role !== 'SuperAdmin') {
        console.warn(`[AuthZ] Non-SuperAdmin user (ID: ${req.user?.userid}, Role: ${req.user?.role}) attempted SuperAdmin action.`);
        return res.status(403).json({ success: false, message: 'Forbidden: Requires SuperAdmin privileges.' });
    }
    next();
};

// GET all organizations (Allow broader access for lookups, e.g., Accounting, Admin)
router.get('/', authenticateToken, async (req, res) => {
    // Add a check for minimum authentication if desired
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    // Optionally add role check if not all authenticated users should see the list
    // const allowedRoles = ['Accounting', 'Admin', 'SuperAdmin'];
    // if (!allowedRoles.includes(req.user.role)) {
    //     return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
    // }

    console.log(`[API GET /organizations] Request received by UserID: ${req.user.userid}, Role: ${req.user.role}`);
    try {
        const result = await pool.query(
            `SELECT 
                organization_id,
                organization_name,
                contact_name,
                contact_email,
                contact_phone,
                address_street,
                address_city,
                address_province,
                address_postal_code,
                ceo_name,
                ceo_phone,
                ceo_email
               FROM organizations
               ORDER BY organization_name`
        );
        res.json({ success: true, organizations: result.rows });
    } catch (err) {
        console.error('[API GET /organizations] Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch organizations' });
    }
});

// POST a new organization (SuperAdmin only)
router.post('/', authenticateToken, checkSuperAdmin, async (req, res) => {
    console.log('[API POST /organizations] Request received with body:', req.body);
    const {
        organization_name, contact_name, contact_email, contact_phone,
        address_street, address_city, address_province, address_postal_code,
        ceo_name, ceo_phone, ceo_email
    } = req.body;

    // Basic validation
    if (!organization_name) {
        return res.status(400).json({ success: false, message: 'Organization Name is required.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO organizations (
                organization_name,
                contact_name,
                contact_email,
                contact_phone,
                address_street,
                address_city,
                address_province,
                address_postal_code,
                ceo_name,
                ceo_phone,
                ceo_email
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING organization_id`,
            [organization_name, contact_name, contact_email, contact_phone, address_street, address_city, address_province, address_postal_code, ceo_name, ceo_phone, ceo_email]
        );
        
        const newOrg = result.rows[0];
        console.log('[API POST /organizations] Organization created successfully:', newOrg);
        res.status(201).json({ success: true, message: 'Organization created successfully.', organization_id: newOrg.organization_id });

    } catch (err) {
        console.error('[API POST /organizations] Error:', err);
        // Check for unique constraint violation (common error)
        if (err.code === '23505' && err.constraint === 'organizations_organization_name_key') {
            return res.status(409).json({ success: false, message: 'Organization with this name already exists.' });
        }
        res.status(500).json({ success: false, message: 'Failed to create organization' });
    }
});

// GET a single organization by ID (SuperAdmin only)
router.get('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`[API GET /organizations/${id}] Request received`);

    if (isNaN(parseInt(id, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    try {
        const result = await pool.query(
            `SELECT 
                organization_id,
                organization_name,
                contact_name,
                contact_email,
                contact_phone,
                address_street,
                address_city,
                address_province,
                address_postal_code,
                ceo_name,
                ceo_phone,
                ceo_email
               FROM organizations
               WHERE organization_id = $1`,
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }
        res.json({ success: true, organization: result.rows[0] });
    } catch (err) {
        console.error(`[API GET /organizations/${id}] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch organization' });
    }
});

// PUT (update) an organization by ID (SuperAdmin only)
router.put('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`[API PUT /organizations/${id}] Request received with body:`, req.body);

    if (isNaN(parseInt(id, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    const {
        organization_name, contact_name, contact_email, contact_phone,
        address_street, address_city, address_province, address_postal_code,
        ceo_name, ceo_phone, ceo_email
    } = req.body;

    if (!organization_name) {
        return res.status(400).json({ success: false, message: 'Organization Name is required for update.' });
    }

    try {
        const result = await pool.query(
            `UPDATE organizations
             SET organization_name = $1,
                 contact_name = $2,
                 contact_email = $3,
                 contact_phone = $4,
                 address_street = $5,
                 address_city = $6,
                 address_province = $7,
                 address_postal_code = $8,
                 ceo_name = $9,
                 ceo_phone = $10,
                 ceo_email = $11
             WHERE organization_id = $12
             RETURNING organization_id`,
            [organization_name, contact_name, contact_email, contact_phone, address_street, address_city, address_province, address_postal_code, ceo_name, ceo_phone, ceo_email, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        const updatedOrg = result.rows[0];
        console.log(`[API PUT /organizations/${id}] Organization updated successfully:`, updatedOrg);
        res.json({ success: true, message: 'Organization updated successfully.', organization: updatedOrg });

    } catch (err) {
        console.error(`[API PUT /organizations/${id}] Error:`, err);
        if (err.code === '23505' && err.constraint === 'organizations_organization_name_key') {
            return res.status(409).json({ success: false, message: 'Another organization with this name already exists.' });
        }
        res.status(500).json({ success: false, message: 'Failed to update organization' });
    }
});

// DELETE an organization (SuperAdmin only)
router.delete('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`[API DELETE /organizations/${id}] Request received`);

    // Basic validation: Check if ID is a number
    if (isNaN(parseInt(id, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Organization ID format.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check for dependent Users
        const userCheck = await client.query('SELECT 1 FROM Users WHERE OrganizationID = $1 LIMIT 1', [id]);
        if (userCheck.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Cannot delete organization: Associated users exist.' });
        }

        // 2. Check for dependent Courses
        const courseCheck = await client.query('SELECT 1 FROM Courses WHERE OrganizationID = $1 LIMIT 1', [id]);
        if (courseCheck.rowCount > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Cannot delete organization: Associated courses exist.' });
        }

        // 3. Perform the deletion if no dependencies found
        const result = await client.query('DELETE FROM organizations WHERE organization_id = $1 RETURNING organization_id', [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK'); // Though technically not needed as nothing was deleted
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        await client.query('COMMIT');
        console.log(`[API DELETE /organizations/${id}] Organization deleted successfully.`);
        res.json({ success: true, message: `Organization ${id} deleted successfully.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API DELETE /organizations/${id}] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to delete organization' });
    } finally {
        client.release();
    }
});

module.exports = router; 