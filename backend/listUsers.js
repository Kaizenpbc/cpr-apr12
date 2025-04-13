const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    password: 'gtacpr', // Hardcoded for now
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE
});

async function listUsers() {
    const client = await pool.connect();
    try {
        console.log('Listing all users...');
        const result = await client.query(
            'SELECT UserID, Username, Role, FirstName, LastName, OrganizationID FROM Users ORDER BY UserID'
        );

        if (result.rows.length === 0) {
            console.log('No users found in the database.');
            return;
        }

        console.log('\nUsers in the database:');
        console.log('----------------------------------------');
        result.rows.forEach(user => {
            console.log(`ID: ${user.userid}`);
            console.log(`Username: ${user.username}`);
            console.log(`Role: ${user.role}`);
            console.log(`Name: ${user.firstname} ${user.lastname}`);
            console.log(`Organization ID: ${user.organizationid || 'None'}`);
            console.log('----------------------------------------');
        });
    } catch (error) {
        console.error('Error listing users:', error);
    } finally {
        client.release();
        await pool.end();
        process.exit();
    }
}

listUsers(); 