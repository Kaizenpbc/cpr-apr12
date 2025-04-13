const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function createDatabase() {
    const pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: 'postgres' // Connect to default database first
    });

    try {
        const client = await pool.connect();
        try {
            // Check if database exists
            const result = await client.query(
                "SELECT 1 FROM pg_database WHERE datname = $1",
                [process.env.DB_DATABASE]
            );

            if (result.rows.length === 0) {
                // Database doesn't exist, create it
                await client.query(`CREATE DATABASE "${process.env.DB_DATABASE}"`);
                console.log(`Database ${process.env.DB_DATABASE} created successfully`);
            } else {
                console.log(`Database ${process.env.DB_DATABASE} already exists`);
            }
        } finally {
            client.release();
        }
    } finally {
        await pool.end();
    }
}

async function initializeDatabase() {
    // First create database if it doesn't exist
    await createDatabase();

    // Now connect to the actual database
    const pool = new Pool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_DATABASE
    });

    const client = await pool.connect();
    try {
        console.log('Connected to database, checking existing tables...');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Existing tables:', tables.rows.map(r => r.table_name).join(', '));

        // Drop all tables
        console.log('Dropping all tables...');
        await client.query('DROP SCHEMA public CASCADE');
        await client.query('CREATE SCHEMA public');
        await client.query('GRANT ALL ON SCHEMA public TO public');
        console.log('Schema reset complete');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        console.log('Reading schema file from:', schemaPath);
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('Schema file read successfully');

        // Execute the schema
        console.log('Executing schema...');
        await client.query(schema);
        console.log('Database schema initialized successfully');

        // Verify tables were created
        const newTables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables after initialization:', newTables.rows.map(r => r.table_name).join(', '));

        // Read and execute the test data
        const testDataPath = path.join(__dirname, '..', 'test_data.sql');
        if (fs.existsSync(testDataPath)) {
            console.log('Reading test data file from:', testDataPath);
            const testData = fs.readFileSync(testDataPath, 'utf8');
            console.log('Test data file read successfully');
            await client.query(testData);
            console.log('Test data loaded successfully');
        } else {
            console.log('Test data file not found:', testDataPath);
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the initialization
initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
}); 