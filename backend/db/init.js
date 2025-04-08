const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function initializeDatabase() {
    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute the schema
        await pool.query(schema);
        console.log('Database schema initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        // Close the pool
        await pool.end();
    }
}

// Run the initialization
initializeDatabase(); 