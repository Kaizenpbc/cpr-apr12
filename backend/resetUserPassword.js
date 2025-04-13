const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    password: 'gtacpr', // Hardcoded for now
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

async function resetUserPassword(username, newPassword) {
    const client = await pool.connect();
    try {
        console.log(`Starting password reset for user: ${username}`);
        await client.query('BEGIN');

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the user's password
        const result = await client.query(
            'UPDATE Users SET Password = $1 WHERE Username = $2 RETURNING UserID, Username, Role',
            [hashedPassword, username]
        );

        if (result.rows.length === 0) {
            console.error(`User ${username} not found!`);
            await client.query('ROLLBACK');
            return;
        }

        await client.query('COMMIT');
        console.log('Password reset successfully!');
        console.log('User details:');
        console.log(`- Username: ${result.rows[0].username}`);
        console.log(`- Role: ${result.rows[0].role}`);
        console.log(`- New password: ${newPassword}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resetting password:', error);
    } finally {
        client.release();
        await pool.end();
        process.exit();
    }
}

// Get username and password from command line arguments
const username = process.argv[2];
const newPassword = process.argv[3];

if (!username || !newPassword) {
    console.error('Usage: node resetUserPassword.js <username> <new_password>');
    process.exit(1);
}

resetUserPassword(username, newPassword); 