// backend/middleware/checkRole.js

const checkSuperAdmin = (req, res, next) => {
    // This assumes authenticateToken middleware runs first and adds req.user
    if (!req.user || req.user.role !== 'SuperAdmin') {
        console.warn(`[AuthZ] Non-SuperAdmin user (ID: ${req.user?.userid}, Role: ${req.user?.role}) attempted SuperAdmin action.`);
        return res.status(403).json({ success: false, message: 'Forbidden: Requires SuperAdmin privileges.' });
    }
    next();
};

// Could add other role checks here later if needed, e.g., checkAdmin, checkAccounting
// const checkAdmin = (req, res, next) => { ... };

module.exports = {
    checkSuperAdmin,
    // checkAdmin, // Export others if added
}; 