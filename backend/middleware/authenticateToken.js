const { pool } = require('../db');

// Basic Authentication Middleware (Needs proper token validation, e.g., JWT)
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <UserID>"

    if (!token) {
        console.warn('[AuthN] No token provided');
        // Allow access but without user info, OR return 401 depending on route needs
        // For protected routes, the role check later will deny access
        // return res.status(401).json({ success: false, message: 'No token provided' });
        req.user = null; // Indicate no authenticated user
        return next(); 
    }

    try {
        // TEMPORARY: Assume token IS the UserID for now
        const userId = parseInt(token, 10);
        if (isNaN(userId)) {
            console.warn(`[AuthN] Invalid token format (expected UserID): ${token}`);
            req.user = null; // Indicate invalid token
            return next(); 
        }

        // Fetch user details from DB based on UserID
        const userResult = await pool.query(
            'SELECT UserID, Username, Role, FirstName, LastName, OrganizationID FROM Users WHERE UserID = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            console.warn(`[AuthN] User not found for token (UserID): ${userId}`);
            req.user = null; // Indicate user not found
            return next(); 
        }
        
        // Attach user info to the request object
        req.user = {
            userid: userResult.rows[0].userid,
            username: userResult.rows[0].username,
            role: userResult.rows[0].role,
            firstname: userResult.rows[0].firstname,
            lastname: userResult.rows[0].lastname,
            organizationId: userResult.rows[0].organizationid // May be null
        };        
        console.log(`[AuthN] User authenticated: ID=${req.user.userid}, Role=${req.user.role}`);
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        console.error('[AuthN] Authentication error:', err);
        // Don't send response here, let route handler decide or use error middleware
        req.user = null; // Indicate error during auth
        next(); // Proceed, maybe to an error handler or let role check fail
    }
};

module.exports = authenticateToken; 