const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

async function addUser() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const password = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Add the user
        const result = await client.query(
            'INSERT INTO users (username, password, role, firstname, lastname, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING userid',
            ['mike', hashedPassword, 'Instructor', 'Michael', 'Annamunthodo', 'mike@example.com']
        );
        
        const userId = result.rows[0].userid;
        
        // Add instructor record
        await client.query(
            'INSERT INTO instructors (userid) VALUES ($1)',
            [userId]
        );
        
        await client.query('COMMIT');
        console.log('User mike added successfully');
        console.log('Password is: admin123');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding user:', error);
    } finally {
        client.release();
    }
}

addUser().then(() => {
    pool.end();
}); 