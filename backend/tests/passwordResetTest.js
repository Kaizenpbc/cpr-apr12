const pool = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function testPasswordResetFlow() {
    console.log('\n=== Testing Password Reset Flow ===\n');
    let testUser = null;
    let resetToken = null;
    let newPassword = 'newTestPassword123';

    try {
        // 1. Create a test user
        console.log('1. Creating test user...');
        const hashedPassword = await bcrypt.hash('testPassword123', 10);
        const result = await pool.query(
            'INSERT INTO users (username, password, role, firstname, lastname, email, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            ['testuser', hashedPassword, 'Organization', 'Test', 'User', 'test@example.com', 1]
        );
        testUser = result.rows[0];
        console.log('✅ Test user created successfully');

        // 2. Generate reset token
        console.log('\n2. Testing password reset token generation...');
        resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE userid = $3',
            [resetToken, tokenExpiry, testUser.userid]
        );
        console.log('✅ Reset token generated and stored successfully');

        // 3. Update password
        console.log('\n3. Testing password update...');
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE userid = $2',
            [newHashedPassword, testUser.userid]
        );
        console.log('✅ Password updated successfully');

        // 4. Verify new password
        console.log('\n4. Testing new password verification...');
        const verifyResult = await pool.query(
            'SELECT password FROM users WHERE userid = $1',
            [testUser.userid]
        );
        const isPasswordValid = await bcrypt.compare(newPassword, verifyResult.rows[0].password);
        if (isPasswordValid) {
            console.log('✅ New password verified successfully');
        } else {
            throw new Error('Password verification failed');
        }

        console.log('\n=== Test Results ===');
        console.log('✅ All tests passed successfully');

    } catch (error) {
        console.error('\n❌ Error during test:', error.message);
        console.log('\n=== Test Results ===');
        console.log('❌ Some tests failed');
    } finally {
        // Clean up: Delete the test user
        if (testUser) {
            try {
                await pool.query('DELETE FROM users WHERE userid = $1', [testUser.userid]);
                console.log('\nTest user cleaned up successfully');
            } catch (error) {
                console.error('Error cleaning up test user:', error.message);
            }
        }
    }
}

testPasswordResetFlow(); 