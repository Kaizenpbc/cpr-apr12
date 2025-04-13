const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// Basic Authentication Middleware (Needs proper token validation, e.g., JWT)
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        console.warn('[AuthN] No token provided');
        // Allow access but without user info, OR return 401 depending on route needs
        // For protected routes, the role check later will deny access
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Verify and decode the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database using token
        const user = await pool.oneOrNone(
            `SELECT u.userid, u.username, u.role, u.firstname, u.lastname, u.organization_id, o.organization_name
             FROM users u
             LEFT JOIN organizations o ON u.organization_id = o.organization_id
             WHERE u.userid = $1`,
            [decoded.userid]
        );

        if (!user) {
            console.warn(`[AuthN] User not found for token (UserID): ${decoded.userid}`);
            return res.status(401).json({ message: 'User not found' });
        }
        
        // Attach user to request
        req.user = {
            userid: user.userid,
            username: user.username,
            role: user.role,
            firstName: user.firstname,
            lastName: user.lastname,
            organizationId: user.organization_id,
            organizationName: user.organization_name
        };        
        console.log(`[AuthN] User authenticated: ID=${req.user.userid}, Role=${req.user.role}`);
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('[AuthN] Authentication error:', error);
        return res.status(500).json({ message: 'Error authenticating user' });
    }
};

module.exports = authenticateToken; 