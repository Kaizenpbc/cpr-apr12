const { pool } = require('../db');

async function testUsersTable() {
    try {
        console.log('\nTesting users table schema...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);
        console.log('Users table columns:', result.rows.map(row => ({
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable
        })));
        return true;
    } catch (err) {
        console.error('Users table schema test failed:', err);
        return false;
    }
}

async function testOrganizationsTable() {
    try {
        console.log('\nTesting organizations table schema...');
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'organizations'
        `);
        console.log('Organizations table columns:', result.rows.map(row => ({
            name: row.column_name,
            type: row.data_type,
            nullable: row.is_nullable
        })));
        return true;
    } catch (err) {
        console.error('Organizations table schema test failed:', err);
        return false;
    }
}

async function testColumnNamesInQueries() {
    try {
        console.log('\nTesting column names in queries...');
        
        // Test users table queries
        const userResult = await pool.query(`
            SELECT userid, username, password, role, firstname, lastname, email, phone, organization_id 
            FROM users 
            LIMIT 1
        `);
        console.log('Users query successful');
        
        // Test organizations table queries
        const orgResult = await pool.query(`
            SELECT organization_id, organization_name, address, city, province, postal_code, phone, email, website 
            FROM organizations 
            LIMIT 1
        `);
        console.log('Organizations query successful');
        
        return true;
    } catch (err) {
        console.error('Column name test failed:', err);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting database schema tests...\n');
    
    const tests = [
        await testUsersTable(),
        await testOrganizationsTable(),
        await testColumnNamesInQueries()
    ];
    
    const allPassed = tests.every(test => test);
    console.log('\nAll tests completed:', allPassed ? 'SUCCESS' : 'FAILED');
    
    // Close the pool
    await pool.end();
}

runAllTests().catch(console.error); 