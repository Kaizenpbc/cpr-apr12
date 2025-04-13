// backend/middleware/checkRole.js

const checkSuperAdmin = (req, res, next) => {
    // This assumes authenticateToken middleware runs first and adds req.user
    if (!req.user || req.user.role !== 'SuperAdmin') {
        console.warn(`[AuthZ] Non-SuperAdmin user (ID: ${req.user?.userid}, Role: ${req.user?.role}) attempted SuperAdmin action.`);
        return res.status(403).json({ success: false, message: 'Forbidden: Requires SuperAdmin privileges.' });
    }
    next();
};

// Define check for Admin OR SuperAdmin
const checkAdminOrSuperAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin')) {
        console.warn(`[AuthZ] Non-Admin/SuperAdmin user (ID: ${req.user?.userid}, Role: ${req.user?.role}) attempted Admin/SuperAdmin action.`);
        return res.status(403).json({ success: false, message: 'Forbidden: Requires Admin or SuperAdmin privileges.' });
    }
    next();
};

// Define check for Accounting OR SuperAdmin
const checkAccountingAccess = (req, res, next) => {
    if (!req.user || (req.user.role !== 'Accounting' && req.user.role !== 'SuperAdmin')) {
        console.warn(`[AuthZ] Unauthorized access attempt to accounting route by UserID: ${req.user?.userid}, Role: ${req.user?.role}`);
        return res.status(403).json({ success: false, message: 'Forbidden: Requires Accounting or SuperAdmin privileges.' });
    }
    next();
};

// Could add other role checks here later if needed, e.g., checkAdmin, checkAccounting
// const checkAdmin = (req, res, next) => { ... };

module.exports = {
    checkSuperAdmin,
    checkAdminOrSuperAdmin, // Export the new function
    checkAccountingAccess, // Also export this for consistency
    // checkAdmin, // Export others if added
}; 