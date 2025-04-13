const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('Database configuration:', {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

const pool = new Pool({
    user: process.env.DB_USER,
    password: 'gtacpr', // Hardcoded for now
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

async function updatePasswords() {
    const client = await pool.connect();
    try {
        console.log('Starting password update process...');
        await client.query('BEGIN');

        // Get all users
        const result = await client.query('SELECT UserID, Username, Password FROM Users');
        console.log(`Found ${result.rows.length} users to process`);
        
        for (const user of result.rows) {
            try {
                // Skip if password is already hashed (bcrypt hashes start with $2a$)
                if (user.password && user.password.startsWith('$2a$')) {
                    console.log(`Skipping ${user.username} - password already hashed`);
                    continue;
                }

                // Hash the password
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(user.password || 'default123', saltRounds);

                // Update the user's password
                await client.query(
                    'UPDATE Users SET Password = $1 WHERE UserID = $2',
                    [hashedPassword, user.userid]
                );

                console.log(`Updated password for user ${user.username}`);
            } catch (userError) {
                console.error(`Error processing user ${user.username}:`, userError);
                // Continue with next user
            }
        }

        await client.query('COMMIT');
        console.log('All passwords updated successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating passwords:', error);
    } finally {
        client.release();
        await pool.end();
        process.exit();
    }
}

updatePasswords().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 