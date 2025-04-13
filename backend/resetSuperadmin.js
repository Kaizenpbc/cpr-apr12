const { pool } = require('./db');
const bcrypt = require('bcrypt');

async function resetSuperadminPassword() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('admin123', saltRounds);
        
        // Update the superadmin password
        const result = await client.query(
            `UPDATE users 
             SET password = $1 
             WHERE username = 'superadmin' 
             RETURNING userid`,
            [hashedPassword]
        );

        if (result.rowCount === 0) {
            console.log('Superadmin user not found');
        } else {
            console.log('Superadmin password reset successfully');
        }
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resetting superadmin password:', error);
    } finally {
        client.release();
        process.exit();
    }
}

resetSuperadminPassword(); 