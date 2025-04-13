const express = require('express');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const bcrypt = require('bcrypt'); // Import bcrypt
const crypto = require('crypto');
const { sendEmail } = require('../utils/email');
require('dotenv').config(); // To access JWT_SECRET
const { body, validationResult } = require('express-validator');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Input validation middleware
const loginValidation = [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').trim().isLength({ min: 6 })
];

const registerValidation = [
    body('username').trim().isLength({ min: 3 }).escape(),
    body('password').trim().isLength({ min: 6 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('firstName').trim().notEmpty().escape(),
    body('lastName').trim().notEmpty().escape()
];

// Password reset validation
const passwordResetValidation = [
    body('currentPassword').trim().isLength({ min: 6 }),
    body('newPassword').trim().isLength({ min: 6 }),
    body('confirmPassword').trim().isLength({ min: 6 })
];

router.post('/login', loginValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    console.log(`[API POST /auth/login] Login attempt for username: ${username}`);

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    try {
        // Fetch user by username, including the hashed password and role
        const result = await pool.query(
            'SELECT userid, username, password, role, firstname, lastname, email, phone, organization_id FROM users WHERE username = $1',
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
            organizationId: user.organization_id, // Include org ID
            organizationName: null // We'll fetch this separately if needed
        };

        // Fetch organization name if user belongs to one
        if (user.role === 'Organization' && user.organization_id) {
            try {
                const orgResult = await pool.query('SELECT organization_name FROM organizations WHERE organization_id = $1', [user.organization_id]);
                if (orgResult.rows.length > 0) {
                    userPayload.organizationName = orgResult.rows[0].organization_name;
                }
            } catch (orgError) {
                console.error('Error fetching organization name during login:', orgError);
                // Proceed without org name, log the error
            }
        }

        console.log('[API POST /auth/login] User object being sent to frontend:', userPayload);

        if (!JWT_SECRET) {
            console.error("[API POST /auth/login] FATAL: JWT_SECRET is not defined in environment variables.");
            return res.status(500).json({ success: false, message: 'Server configuration error.' });
        }
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1h' });

        // Send user data (without password) and the ACTUAL token
        res.json({ success: true, user: userPayload, token: token }); // <<< Send the generated token

    } catch (error) {
        console.error('[API POST /auth/login] Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed due to server error.' });
    }
});

// Register route with validation
router.post('/register', registerValidation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, password, email, firstName, lastName } = req.body;
        // ... existing registration code ...
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await pool.oneOrNone('SELECT * FROM Users WHERE Email = $1', [email]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await pool.none(
      'UPDATE Users SET ResetToken = $1, ResetTokenExpiry = $2 WHERE UserID = $3',
      [resetToken, resetTokenExpiry, user.UserID]
    );

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      user.Email,
      'Password Reset Request',
      `Click the following link to reset your password: ${resetUrl}`,
      `<p>Click the following link to reset your password: <a href="${resetUrl}">Reset Password</a></p>`
    );

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid reset token
    const user = await pool.oneOrNone(
      'SELECT * FROM Users WHERE ResetToken = $1 AND ResetTokenExpiry > NOW()',
      [token]
    );

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await pool.none(
      'UPDATE Users SET Password = $1, ResetToken = NULL, ResetTokenExpiry = NULL WHERE UserID = $2',
      [hashedPassword, user.UserID]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Forgot Password Endpoint
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Find user by email
    const userResult = await pool.query(
      'SELECT userid, username, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Return success even if user not found to prevent email enumeration
      return res.status(200).json({ 
        message: 'If an account exists with this email, you will receive password reset instructions.' 
      });
    }

    const user = userResult.rows[0];
    
    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Store token in database
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.userid, token, expiresAt]
    );

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <p>Hello ${user.username},</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    res.status(200).json({ 
      message: 'If an account exists with this email, you will receive password reset instructions.' 
    });
  } catch (error) {
    console.error('[Auth] Password reset request error:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

module.exports = router; 