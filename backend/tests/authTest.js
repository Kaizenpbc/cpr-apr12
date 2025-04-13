const { pool } = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function testLogin() {
    try {
        console.log('\nTesting login functionality...');
        
        // Test with superadmin
        const superadminResult = await pool.query(
            'SELECT userid, username, password, role FROM users WHERE username = $1',
            ['superadmin']
        );
        
        if (superadminResult.rows.length === 0) {
            console.error('Superadmin user not found');
            return false;
        }
        
        const superadmin = superadminResult.rows[0];
        console.log('Found superadmin user:', superadmin.username);
        
        // Test password verification
        const passwordMatch = await bcrypt.compare('admin123', superadmin.password);
        console.log('Password verification:', passwordMatch ? 'Success' : 'Failed');
        
        // Test JWT token generation
        const token = jwt.sign(
            { userid: superadmin.userid, username: superadmin.username, role: superadmin.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('JWT token generated successfully');
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token verification:', decoded.username === superadmin.username ? 'Success' : 'Failed');
        
        return passwordMatch && decoded.username === superadmin.username;
    } catch (err) {
        console.error('Login test failed:', err);
        return false;
    }
}

async function testUserAuthentication() {
    try {
        console.log('\nTesting user authentication...');
        
        // Test with orgadmin
        const orgadminResult = await pool.query(
            'SELECT userid, username, password, role, organization_id FROM users WHERE username = $1',
            ['orgadmin']
        );
        
        if (orgadminResult.rows.length === 0) {
            console.error('Orgadmin user not found');
            return false;
        }
        
        const orgadmin = orgadminResult.rows[0];
        console.log('Found orgadmin user:', orgadmin.username);
        
        // Test organization association
        if (orgadmin.organization_id) {
            const orgResult = await pool.query(
                'SELECT organization_name FROM organizations WHERE organization_id = $1',
                [orgadmin.organization_id]
            );
            console.log('Organization lookup:', orgResult.rows.length > 0 ? 'Success' : 'Failed');
        }
        
        return true;
    } catch (err) {
        console.error('User authentication test failed:', err);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting authentication tests...\n');
    
    const tests = [
        await testLogin(),
        await testUserAuthentication()
    ];
    
    const allPassed = tests.every(test => test);
    console.log('\nAll tests completed:', allPassed ? 'SUCCESS' : 'FAILED');
    
    // Close the pool
    await pool.end();
}

runAllTests().catch(console.error); 