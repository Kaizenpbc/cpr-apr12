const pool = require('../db');

async function addResetTokenColumns() {
    try {
        // Add reset_token and reset_token_expiry columns to users table
        await pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
            ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP
        `);

        console.log('✅ Reset token columns added successfully');
    } catch (error) {
        console.error('❌ Error adding reset token columns:', error.message);
    }
}

addResetTokenColumns(); 