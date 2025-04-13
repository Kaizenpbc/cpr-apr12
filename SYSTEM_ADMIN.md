# CPR System Administration Guide

## Table of Contents
1. [Server Management](#server-management)
2. [User Management](#user-management)
3. [Troubleshooting](#troubleshooting)
4. [Security](#security)
5. [Monitoring](#monitoring)
6. [Directory Structure](#directory-structure)
7. [Common Scenarios](#common-scenarios)
8. [Log Analysis](#log-analysis)
9. [Process Management](#process-management)

## Directory Structure

### Project Layout
```
CPR-Apr-5 - Copy/
├── backend/              # Backend server code
│   ├── server.js        # Main server file
│   ├── resetSuperadmin.js # Password reset utility
│   ├── package.json     # Backend dependencies
│   └── .env            # Environment variables
└── frontend/            # Frontend application
```

### Important Note
- Always run commands from the correct directory
- Backend commands must be run from `backend/` directory
- Frontend commands must be run from `frontend/` directory
- Common mistake: Running `npm run dev` from root directory will fail with "Missing script: dev"

## Process Management

### Starting the Server
```bash
# Navigate to backend directory
cd backend

# Start the server
npm run dev
```

Expected successful startup output:
```
[Server Start] Cookie parser imported
[Server Start] Secret starts with: deeb6...
[DB] PostgreSQL Pool created.
[Server Start] Required modules loaded.
Database pool error listener attached.
[Server Start] Socket.IO server attached to HTTP server.
[Server Start] CORS configured
[Server Start] Body parsers configured
[Server Start] Cookie parser configured
[Server Start] Session configured
[Server Start] Mounting route handlers...
[Server Start] Route handlers mounted.
[Server Start] Global error handlers attached.
[Server Start] Attempting to listen on port 3001...
Attempting to start server on port 3001...
[Server Start] Socket.IO connection handler attached.
---> Server successfully running on port 3001 <---
Ready for connections.
```

### Stopping the Server
```bash
# Stop all Node.js processes
taskkill /F /IM node.exe
```

Expected output:
```
SUCCESS: The process "node.exe" with PID XXXX has been terminated.
SUCCESS: The process "node.exe" with PID YYYY has been terminated.
...
```

### Multiple Process Handling
If you see multiple Node.js processes running:
```bash
# List all Node.js processes
tasklist | findstr node.exe

# Stop all Node.js processes
taskkill /F /IM node.exe
```

## Log Analysis

### Successful Server Startup
```
[Server Start] Cookie parser imported
[Server Start] Secret starts with: deeb6...
[DB] PostgreSQL Pool created.
[Server Start] Required modules loaded.
Database pool error listener attached.
[Server Start] Socket.IO server attached to HTTP server.
[Server Start] CORS configured
[Server Start] Body parsers configured
[Server Start] Cookie parser configured
[Server Start] Session configured
[Server Start] Mounting route handlers...
[Server Start] Route handlers mounted.
[Server Start] Global error handlers attached.
[Server Start] Attempting to listen on port 3001...
Attempting to start server on port 3001...
[Server Start] Socket.IO connection handler attached.
---> Server successfully running on port 3001 <---
Ready for connections.
```

### Authentication Logs

#### Successful Login
```
[CSRF] Generating token...
[CSRF] Token generated successfully
[API POST /auth/login] Login attempt for username: superadmin
[API POST /auth/login] Found user: superadmin, Role: SuperAdmin
[API POST /auth/login] Password verified for user: superadmin
[API POST /auth/login] User object being sent to frontend: {
  userid: 5,
  username: 'superadmin',
  role: 'SuperAdmin',
  firstName: 'Coujoe',
  lastName: 'Annamunthodo',
  organizationId: null,
  organizationName: null
}
[Socket.IO] Connection established: [socket-id]
[Socket.IO] Socket [socket-id] identified as UserID: 5
[Socket.IO] UserID 5 added to map. Current map size: 1
[AuthN] User authenticated: ID=5, Role=SuperAdmin
```

#### Failed Login
```
[CSRF] Generating token...
[CSRF] Token generated successfully
[API POST /auth/login] Login attempt for username: superadmin
[API POST /auth/login] Found user: superadmin, Role: SuperAdmin
[API POST /auth/login] Login failed: Password mismatch for user - superadmin
```

### Socket.IO Events
```
[Socket.IO] Connection established: [socket-id]
[Socket.IO] Socket [socket-id] identified as UserID: [id]
[Socket.IO] UserID [id] added to map. Current map size: 1
[Socket.IO] Socket disconnected: [socket-id], Reason: undefined
[Socket.IO] Removed UserID [id] from socket map. Current map size: 0
```

## Common Scenarios

### 1. Server Won't Start
**Error:**
```
npm error Missing script: "dev"
```

**Solution:**
1. Verify current directory:
   ```bash
   pwd  # Should show: .../CPR-Apr-5 - Copy/backend
   ```
2. If not in backend directory:
   ```bash
   cd backend
   ```
3. Try starting server again:
   ```bash
   npm run dev
   ```

### 2. CSRF Token Issues
**Error:**
```
[CSRF] Error generating token: TypeError: req.csrfToken is not a function
```

**Solution:**
1. Stop the server:
   ```bash
   taskkill /F /IM node.exe
   ```
2. Restart the server:
   ```bash
   npm run dev
   ```
3. Verify token generation:
   ```
   [CSRF] Token generated successfully
   ```

### 3. Multiple Node Processes
**Issue:** Multiple Node.js processes running
**Solution:**
```bash
# Stop all Node.js processes
taskkill /F /IM node.exe
```

Expected output:
```
SUCCESS: The process "node.exe" with PID XXXX has been terminated.
SUCCESS: The process "node.exe" with PID YYYY has been terminated.
...
```

## User Management

### Default Credentials
1. **SuperAdmin**
   - Username: `superadmin`
   - Default Password: `admin123`
   - Role: SuperAdmin
   - Full system access

2. **Organization Admin**
   - Username: `orgadmin`
   - Default Password: `org123`
   - Role: Organization
   - Organization-specific access

### Password Reset Procedures

#### 1. SuperAdmin Password Reset
```bash
# Navigate to backend directory
cd backend

# Reset superadmin password
node resetSuperadmin.js
```

Expected output:
```
Starting superadmin password reset...
Superadmin password reset successfully!
New password: admin123
```

#### 2. Organization Admin Password Reset
```bash
# Navigate to backend directory
cd backend

# Reset orgadmin password
node resetOrgAdmin.js
```

Expected output:
```
Starting orgadmin password reset...
Orgadmin password reset successfully!
New password: org123
```

### Password Reset Best Practices
1. **Before Reset**
   - Verify the user exists in the system
   - Check if the user is currently logged in
   - Inform the user about the password reset

2. **After Reset**
   - Verify the new password works
   - Document the reset in the system logs
   - Inform the user of the new password
   - Advise the user to change the password after first login

3. **Security Considerations**
   - Use strong, randomly generated passwords
   - Ensure passwords meet complexity requirements
   - Reset passwords in a secure environment
   - Never share passwords via unsecured channels

## Security

### Password Security
- All passwords are hashed using bcrypt
- Salt rounds: 10
- Passwords are never stored in plain text

### CSRF Protection
- Tokens generated per session
- Validated on all non-GET requests
- Stored in secure, HTTP-only cookies

### Session Management
- Secure cookie settings
- HTTP-only cookies
- SameSite attribute enabled
- Session timeout: 1 hour

## Best Practices

1. **Regular Maintenance**
   - Monitor server logs daily
   - Check for failed login attempts
   - Verify CSRF token generation
   - Monitor database connections

2. **Security**
   - Regularly update dependencies
   - Monitor for security vulnerabilities
   - Keep passwords secure
   - Follow least privilege principle

3. **Backup**
   - Regular database backups
   - User data preservation
   - Configuration file backups

4. **Documentation**
   - Keep this guide updated
   - Document any custom configurations
   - Maintain change logs
   - Record troubleshooting procedures 