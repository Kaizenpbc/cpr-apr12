const { pool } = require('../db');
const bcrypt = require('bcrypt');

async function testDatabaseConnection() {
    try {
        console.log('Testing database connection...');
        const result = await pool.query('SELECT NOW()');
        console.log('Database connection successful:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('Database connection failed:', err);
        return false;
    }
}

async function testUserTable() {
    try {
        console.log('\nTesting users table...');
        const result = await pool.query('SELECT * FROM users LIMIT 1');
        console.log('Users table exists and has data:', result.rows.length > 0);
        return true;
    } catch (err) {
        console.error('Users table test failed:', err);
        return false;
    }
}

async function testOrganizationsTable() {
    try {
        console.log('\nTesting organizations table...');
        const result = await pool.query('SELECT * FROM organizations LIMIT 1');
        console.log('Organizations table exists and has data:', result.rows.length > 0);
        return true;
    } catch (err) {
        console.error('Organizations table test failed:', err);
        return false;
    }
}

async function testPasswordHashing() {
    try {
        console.log('\nTesting password hashing...');
        const password = 'test123';
        const hash = await bcrypt.hash(password, 10);
        const match = await bcrypt.compare(password, hash);
        console.log('Password hashing test:', match ? 'Success' : 'Failed');
        return match;
    } catch (err) {
        console.error('Password hashing test failed:', err);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting database tests...\n');
    
    const tests = [
        await testDatabaseConnection(),
        await testUserTable(),
        await testOrganizationsTable(),
        await testPasswordHashing()
    ];
    
    const allPassed = tests.every(test => test);
    console.log('\nAll tests completed:', allPassed ? 'SUCCESS' : 'FAILED');
    
    // Close the pool
    await pool.end();
}

runAllTests().catch(console.error); 