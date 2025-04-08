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

// GET all organizations (SuperAdmin only)
router.get('/', authenticateToken, checkSuperAdmin, async (req, res) => {
    console.log('[API GET /organizations] Request received');
    try {
        const result = await pool.query('SELECT * FROM Organizations ORDER BY OrganizationName');
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
        organizationName, contactName, contactEmail, contactPhone,
        addressStreet, addressCity, addressProvince, addressPostalCode,
        mainPhone, ceoName, ceoPhone, ceoEmail
    } = req.body;

    // Basic validation
    if (!organizationName) {
        return res.status(400).json({ success: false, message: 'Organization Name is required.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO Organizations (
                OrganizationName, ContactName, ContactEmail, ContactPhone, 
                AddressStreet, AddressCity, AddressProvince, AddressPostalCode, 
                MainPhone, CEOName, CEOPhone, CEOEmail
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING *`,
            [
                organizationName, contactName, contactEmail, contactPhone,
                addressStreet, addressCity, addressProvince, addressPostalCode,
                mainPhone, ceoName, ceoPhone, ceoEmail
            ]
        );
        
        const newOrg = result.rows[0];
        console.log('[API POST /organizations] Organization created successfully:', newOrg);
        res.status(201).json({ success: true, message: 'Organization created successfully.', organization: newOrg });

    } catch (err) {
        console.error('[API POST /organizations] Error:', err);
        // Check for unique constraint violation (common error)
        if (err.code === '23505' && err.constraint === 'organizations_organizationname_key') {
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
        const result = await pool.query('SELECT * FROM Organizations WHERE OrganizationID = $1', [id]);
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
        organizationName, contactName, contactEmail, contactPhone,
        addressStreet, addressCity, addressProvince, addressPostalCode,
        mainPhone, ceoName, ceoPhone, ceoEmail
    } = req.body;

    if (!organizationName) {
        return res.status(400).json({ success: false, message: 'Organization Name is required for update.' });
    }

    try {
        const result = await pool.query(
            `UPDATE Organizations SET 
                OrganizationName = $1, ContactName = $2, ContactEmail = $3, ContactPhone = $4, 
                AddressStreet = $5, AddressCity = $6, AddressProvince = $7, AddressPostalCode = $8, 
                MainPhone = $9, CEOName = $10, CEOPhone = $11, CEOEmail = $12, 
                UpdatedAt = CURRENT_TIMESTAMP
             WHERE OrganizationID = $13
             RETURNING *`,
            [
                organizationName, contactName, contactEmail, contactPhone, 
                addressStreet, addressCity, addressProvince, addressPostalCode, 
                mainPhone, ceoName, ceoPhone, ceoEmail, 
                id 
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Organization not found.' });
        }

        const updatedOrg = result.rows[0];
        console.log(`[API PUT /organizations/${id}] Organization updated successfully:`, updatedOrg);
        res.json({ success: true, message: 'Organization updated successfully.', organization: updatedOrg });

    } catch (err) {
        console.error(`[API PUT /organizations/${id}] Error:`, err);
        if (err.code === '23505' && err.constraint === 'organizations_organizationname_key') {
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
        const result = await client.query('DELETE FROM Organizations WHERE OrganizationID = $1 RETURNING OrganizationID', [id]);

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