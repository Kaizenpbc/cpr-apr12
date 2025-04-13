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

async function resetOrgAdminPassword() {
    const client = await pool.connect();
    try {
        console.log('Starting orgadmin password reset...');
        await client.query('BEGIN');

        // Hash the new password
        const saltRounds = 10;
        const newPassword = 'org123';
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update the orgadmin password
        const result = await client.query(
            'UPDATE Users SET Password = $1 WHERE Username = $2 RETURNING UserID, Username',
            [hashedPassword, 'orgadmin']
        );

        if (result.rows.length === 0) {
            console.error('Orgadmin user not found!');
            await client.query('ROLLBACK');
            return;
        }

        await client.query('COMMIT');
        console.log('Orgadmin password reset successfully!');
        console.log('New password:', newPassword);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resetting orgadmin password:', error);
    } finally {
        client.release();
        await pool.end();
        process.exit();
    }
}

resetOrgAdminPassword(); 