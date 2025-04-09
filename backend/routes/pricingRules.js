const express = require('express');
const { pool } = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Middleware for SuperAdmin Check (duplicate - should be refactored)
const checkSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Requires SuperAdmin privileges.' });
    }
    next();
};

// GET all pricing rules (SuperAdmin only)
router.get('/', authenticateToken, checkSuperAdmin, async (req, res) => {
    console.log('[API GET /pricing-rules] Request received');
    try {
        // Join with org and course type names for better display
        const result = await pool.query(`
            SELECT 
                pr.PricingID, pr.OrganizationID, pr.CourseTypeID, pr.Price, 
                o.OrganizationName, ct.CourseTypeName
            FROM OrganizationCoursePricing pr
            JOIN Organizations o ON pr.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON pr.CourseTypeID = ct.CourseTypeID
            ORDER BY o.OrganizationName, ct.CourseTypeName
        `);
        res.json({ success: true, pricingRules: result.rows });
    } catch (err) {
        console.error('[API GET /pricing-rules] Error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch pricing rules' });
    }
});

// POST a new pricing rule (SuperAdmin only)
router.post('/', authenticateToken, checkSuperAdmin, async (req, res) => {
    console.log('[API POST /pricing-rules] Request received with body:', req.body);
    const { organizationId, courseTypeId, price } = req.body;

    if (!organizationId || !courseTypeId || price === undefined || isNaN(parseFloat(price))) {
        return res.status(400).json({ success: false, message: 'OrganizationID, CourseTypeID, and a valid Price are required.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO OrganizationCoursePricing (OrganizationID, CourseTypeID, Price)
             VALUES ($1, $2, $3) RETURNING *`,
            [organizationId, courseTypeId, parseFloat(price)]
        );
        // Fetch the newly created rule with names for response
        const newRuleResult = await pool.query(`
             SELECT pr.PricingID, pr.OrganizationID, pr.CourseTypeID, pr.Price, 
                    o.OrganizationName, ct.CourseTypeName
             FROM OrganizationCoursePricing pr
             JOIN Organizations o ON pr.OrganizationID = o.OrganizationID
             JOIN CourseTypes ct ON pr.CourseTypeID = ct.CourseTypeID
             WHERE pr.PricingID = $1
         `, [result.rows[0].pricingid]);

        res.status(201).json({ success: true, message: 'Pricing rule created.', pricingRule: newRuleResult.rows[0] });
    } catch (err) {
        console.error('[API POST /pricing-rules] Error:', err);
        if (err.code === '23505') { // Unique constraint violation
             return res.status(409).json({ success: false, message: 'Pricing rule for this Organization and Course Type already exists.' });
        }
        if (err.code === '23503') { // Foreign key violation
             return res.status(400).json({ success: false, message: 'Invalid OrganizationID or CourseTypeID provided.'});
        }
        res.status(500).json({ success: false, message: 'Failed to create pricing rule' });
    }
});

// PUT (update) a pricing rule (SuperAdmin only)
router.put('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params; // This is PricingID
    const { organizationId, courseTypeId, price } = req.body; // Allow updating all fields? Or just price?
    console.log(`[API PUT /pricing-rules/${id}] Request received with body:`, req.body);

    // For simplicity, let's only allow updating the PRICE for a given PricingID
    // Changing Org/CourseType would likely mean deleting and creating a new rule
    if (price === undefined || isNaN(parseFloat(price))) {
        return res.status(400).json({ success: false, message: 'A valid Price is required for update.' });
    }
     if (isNaN(parseInt(id, 10))) {
         return res.status(400).json({ success: false, message: 'Invalid Pricing Rule ID format.' });
     }

    try {
        const result = await pool.query(
            `UPDATE OrganizationCoursePricing SET Price = $1, UpdatedAt = CURRENT_TIMESTAMP 
             WHERE PricingID = $2 RETURNING *`,
            [parseFloat(price), id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Pricing rule not found.' });
        }
        // Fetch updated rule with names
         const updatedRuleResult = await pool.query(`
             SELECT pr.PricingID, pr.OrganizationID, pr.CourseTypeID, pr.Price, 
                    o.OrganizationName, ct.CourseTypeName
             FROM OrganizationCoursePricing pr
             JOIN Organizations o ON pr.OrganizationID = o.OrganizationID
             JOIN CourseTypes ct ON pr.CourseTypeID = ct.CourseTypeID
             WHERE pr.PricingID = $1
         `, [id]);

        res.json({ success: true, message: 'Pricing rule updated.', pricingRule: updatedRuleResult.rows[0] });
    } catch (err) {
        console.error(`[API PUT /pricing-rules/${id}] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to update pricing rule' });
    }
});

// DELETE a pricing rule (SuperAdmin only)
router.delete('/:id', authenticateToken, checkSuperAdmin, async (req, res) => {
    const { id } = req.params; // This is PricingID
    console.log(`[API DELETE /pricing-rules/${id}] Request received`);

    if (isNaN(parseInt(id, 10))) {
         return res.status(400).json({ success: false, message: 'Invalid Pricing Rule ID format.' });
     }

    try {
        const result = await pool.query('DELETE FROM OrganizationCoursePricing WHERE PricingID = $1 RETURNING PricingID', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Pricing rule not found.' });
        }
        res.json({ success: true, message: `Pricing rule ${id} deleted.` });
    } catch (err) {
        console.error(`[API DELETE /pricing-rules/${id}] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to delete pricing rule' });
    }
});

module.exports = router; 