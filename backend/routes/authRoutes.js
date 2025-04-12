const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const bcrypt = require('bcrypt'); // Import bcrypt
require('dotenv').config(); // To access JWT_SECRET

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`[API POST /auth/login] Login attempt for username: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        // Fetch user by username, including the hashed password and role
        const result = await pool.query(
            'SELECT UserID, Username, Password, Role, FirstName, LastName, Email, Phone, OrganizationID FROM Users WHERE Username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            console.warn(`[API POST /auth/login] Login failed: User not found - ${username}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const user = result.rows[0];
        console.log(`[API POST /auth/login] Found user: ${username}, Role: ${user.role}`);

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.warn(`[API POST /auth/login] Login failed: Password mismatch for user - ${username}`);
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        console.log(`[API POST /auth/login] Password verified for user: ${username}`);

        // If password matches, generate JWT token
        const userPayload = {
            userid: user.userid,
            username: user.username,
            role: user.role,
            // Add other relevant, non-sensitive user info needed by frontend
            firstName: user.firstname,
            lastName: user.lastname,
            organizationId: user.organizationid, // Include org ID
            organizationName: null // We'll fetch this separately if needed
        };

        // Fetch organization name if user belongs to one
        if (user.role === 'Organization' && user.organizationid) {
            try {
                const orgResult = await pool.query('SELECT OrganizationName FROM Organizations WHERE OrganizationID = $1', [user.organizationid]);
                if (orgResult.rows.length > 0) {
                    userPayload.organizationName = orgResult.rows[0].organizationname;
                }
            } catch (orgError) {
                console.error('Error fetching organization name during login:', orgError);
                // Proceed without org name, log the error
            }
        }

        console.log('[API POST /auth/login] User object being sent to frontend:', userPayload);

        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' }); // Set token expiry

        // Send user data (without password) and token
        res.json({ success: true, user: userPayload, token: user.userid }); // **KEEPING TOKEN AS USERID FOR NOW**

    } catch (error) {
        console.error('[API POST /auth/login] Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed due to server error.' });
    }
});

module.exports = router; 