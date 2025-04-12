const express = require('express');
const cors = require('cors');
const http = require('http'); // Import Node's http module
const { Server } = require("socket.io"); // Import socket.io Server
require('dotenv').config();
const { pool } = require('./db'); // Import the pool for logging

// Import route handlers
// const authRoutes = require('./routes/auth'); // Assuming this structure
const organizationRoutes = require('./routes/organizations');
const userRoutes = require('./routes/users');
const courseTypeRoutes = require('./routes/courseTypes');
const pricingRuleRoutes = require('./routes/pricingRules');
const accountingRoutes = require('./routes/accounting');
const courseRoutes = require('./routes/courses'); // Add this
const instructorRoutes = require('./routes/instructors'); // Import instructor routes
const authenticateToken = require('./middleware/authenticateToken'); // Import middleware

console.log('[Server Start] Required modules loaded.'); // <<< ADD LOG

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app

// Add detailed logging for pool errors
pool.on('error', (err, client) => {
  console.error('[DATABASE POOL ERROR] Unexpected error on idle client', err);
  // process.exit(-1); // Optional: exit if pool error is critical
});
console.log('Database pool error listener attached.');

// Attach socket.io to the HTTP server
const io = new Server(server, {
  cors: { origin: "*" } // Simplified CORS for testing
});
console.log('[Server Start] Socket.IO server attached to HTTP server.'); // <<< ADD LOG

// const port = process.env.PORT || 3001; // Moved port definition lower

// Simple in-memory store for user sockets (Replace with Redis/DB in production)
const userSockets = new Map(); 

// Apply Middleware
console.log('[Server Start] Applying middleware (CORS, JSON)...');
app.use(cors());
app.use(express.json());
// Note: authenticateToken is applied per-route or per-router
console.log('[Server Start] Core middleware applied.'); // <<< ADD LOG

// Mount route handlers
// app.use('/api/auth', authRoutes); // Example
console.log('[Server Start] Mounting route handlers...');
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/course-types', courseTypeRoutes);
app.use('/api/pricing-rules', pricingRuleRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/courses', courseRoutes); // Add this (ensure base path is correct)
app.use('/api/instructor', instructorRoutes); // Mount instructor routes
console.log('[Server Start] Route handlers mounted.'); // <<< ADD LOG

// Test database connection - Enhanced
app.get('/api/test', async (req, res) => {
    console.log('GET /api/test received');
    try {
        // Test database connection
        console.log('Testing database connection...');
        const dbResult = await pool.query('SELECT NOW()');
        console.log('Database test query successful:', dbResult.rows[0]);
        res.json({ message: 'Backend is running!', dbTime: dbResult.rows[0].now });
    } catch (dbError) {
        console.error('[API TEST ERROR] Database query failed:', dbError);
        res.status(500).json({ message: 'Backend running, but DB connection failed.' });
    }
});

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const result = await pool.query(
            'SELECT UserID, Username, Role, FirstName, LastName, OrganizationID FROM Users WHERE Username = $1 AND Password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = user.userid.toString();
            
            let organizationName = null;
            // If user has an organizationId, fetch the organization name
            if (user.organizationid) {
                try {
                    const orgResult = await pool.query('SELECT OrganizationName FROM organizations WHERE OrganizationID = $1', [user.organizationid]);
                    if (orgResult.rows.length > 0) {
                        organizationName = orgResult.rows[0].organizationname; // Use lowercase key returned by pg
                    }
                } catch (orgErr) {
                    console.error("Error fetching organization name during login:", orgErr);
                    // Don't fail login if org name fetch fails, just leave it null
                }
            }

            // <<< DETAILED LOGGING START >>>
            const userPayload = {
                userid: user.userid,
                username: user.username,
                role: user.role,
                firstname: user.firstname,
                lastname: user.lastname,
                organizationId: user.organizationid,
                organizationName: organizationName // This might be null
            };
            console.log('[API POST /auth/login] User object being sent to frontend:', JSON.stringify(userPayload, null, 2));
            // <<< DETAILED LOGGING END >>>
            
            res.json({ 
                success: true, 
                user: userPayload, // Send the prepared payload
                token
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get all courses with related information
app.get('/api/courses', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.CourseID,
                c.CourseNumber,
                c.DateRequested,
                c.DateScheduled,
                c.Location,
                c.Status,
                ct.CourseTypeName,
                o.OrganizationName,
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
                COUNT(s.StudentID) as ActualStudents
            FROM Courses c
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            LEFT JOIN Students s ON c.CourseID = s.CourseID
            GROUP BY 
                c.CourseID, 
                c.CourseNumber,
                ct.CourseTypeName,
                o.OrganizationName,
                u.FirstName,
                u.LastName
            ORDER BY c.DateRequested DESC
        `);
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get course details including students
app.get('/api/courses/:id', async (req, res) => {
    try {
        const courseResult = await pool.query(`
            SELECT 
                c.*,
                ct.CourseTypeName,
                ct.Description as CourseTypeDescription,
                o.OrganizationName,
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName
            FROM Courses c
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            WHERE c.CourseID = $1
        `, [req.params.id]);

        const studentsResult = await pool.query(`
            SELECT * FROM Students WHERE CourseID = $1
        `, [req.params.id]);

        if (courseResult.rows.length > 0) {
            const course = courseResult.rows[0];
            course.students = studentsResult.rows;
            res.json({ success: true, course });
        } else {
            res.status(404).json({ success: false, message: 'Course not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get instructor schedule
app.get('/api/instructors/:id/schedule', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.CourseID,
                c.CourseNumber,
                c.DateScheduled,
                c.Location,
                ct.CourseTypeName,
                o.OrganizationName
            FROM Courses c
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            WHERE c.InstructorID = $1 AND c.Status = 'Scheduled'
            ORDER BY c.DateScheduled
        `, [req.params.id]);
        
        res.json({ success: true, schedule: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get organization's courses
app.get('/api/organizations/:id/courses', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.CourseNumber, c.DateRequested, c.DateScheduled, 
                c.Location, c.Status, c.Notes, c.StudentsRegistered,
                ct.CourseTypeName,
                o.OrganizationName,
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
                -- Calculate StudentsAttendance count
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as StudentsAttendance 
            FROM Courses c
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            LEFT JOIN Students s ON c.CourseID = s.CourseID
            WHERE c.OrganizationID = $1
            GROUP BY 
                c.CourseID, c.CreatedAt, c.CourseNumber, c.DateRequested, c.DateScheduled, c.Location, 
                c.Status, c.Notes, c.StudentsRegistered, ct.CourseTypeName, o.OrganizationName, u.FirstName, u.LastName
            ORDER BY c.DateRequested ASC 
        `, [req.params.id]);
        
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        console.error("Error fetching organization courses:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Instructor Availability Endpoints (MOVED TO routes/instructors.js)
// app.post('/api/instructor/availability', authenticateToken, async (req, res) => {
//     // ... (removed code) ...
// });
// 
// app.delete('/api/instructor/availability/:date', authenticateToken, async (req, res) => {
//     // ... (removed code) ...
// });
// 
// app.get('/api/instructor/availability', authenticateToken, async (req, res) => {
//     // ... (removed code) ...
// });

// Scheduled Classes Endpoints (Corrected for Instructor Portal) (MOVED TO routes/instructors.js)
// app.get('/api/instructor/classes', authenticateToken, async (req, res) => {
//     // ... (removed code) ...
// });
// 
// // This POST was likely incorrect or unused, also moved/removed implicitly
// app.post('/api/instructor/classes', authenticateToken, async (req, res) => {
//     // ... (removed code) ...
// });

// --- Course Types Endpoint ---
app.get('/api/course-types', async (req, res) => {
    try {
        const result = await pool.query('SELECT CourseTypeID, CourseTypeName FROM CourseTypes ORDER BY CourseTypeName');
        res.json({ success: true, courseTypes: result.rows });
    } catch (err) {
        console.error('Error fetching course types:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch course types' });
    }
});

// --- Request Course Endpoint (Organization) ---
app.post('/api/courses/request', authenticateToken, async (req, res) => {
    const { dateRequested, location, courseTypeId, registeredStudents, notes } = req.body;
    const organizationId = req.user.organizationId; // <<< We need to add this to req.user

    // --- TODO: Modify authenticateToken or add middleware --- 
    // --- to fetch organizationId based on req.user.userid --- 
    if (!organizationId) {
        console.error('Organization ID not found for user:', req.user.userid);
        return res.status(403).json({ success: false, message: 'User is not associated with an organization.' });
    }
    
    if (!dateRequested || !location || !courseTypeId || registeredStudents === undefined) {
        return res.status(400).json({ success: false, message: 'Missing required fields: dateRequested, location, courseTypeId, registeredStudents' });
    }

    try {
        // Query for Organization NAME
        const orgResult = await pool.query('SELECT OrganizationName FROM organizations WHERE OrganizationID = $1', [organizationId]);
        
        // Query for CourseType CODE (use code now for CourseNumber)
        const typeResult = await pool.query('SELECT CourseCode FROM CourseTypes WHERE CourseTypeID = $1', [courseTypeId]);
        
        if (orgResult.rows.length === 0 || typeResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid Organization or Course Type ID' });
        }
        
        const datePart = new Date(dateRequested).toISOString().slice(0, 10).replace(/-/g, '');
        const orgPart = orgResult.rows[0].organizationname.substring(0, 3).toUpperCase();
        const typePart = typeResult.rows[0].coursecode.toUpperCase(); 
        let baseCourseNumber = `${datePart}-${orgPart}-${typePart}`;
        let finalCourseNumber = baseCourseNumber;
        let sequence = 0;

        // Loop to find a unique course number
        // eslint-disable-next-line no-constant-condition
        while (true) { 
            const checkResult = await pool.query('SELECT 1 FROM Courses WHERE CourseNumber = $1', [finalCourseNumber]);
            if (checkResult.rowCount === 0) {
                break; 
            }
            sequence++;
            finalCourseNumber = `${baseCourseNumber}-${sequence}`;
            console.log(`Duplicate CourseNumber ${baseCourseNumber} detected, trying ${finalCourseNumber}`);
            if (sequence > 99) { 
                 throw new Error('Could not generate a unique course number after 99 attempts.');
            }
        }

        // Now insert with the guaranteed unique finalCourseNumber
        const result = await pool.query(
            `INSERT INTO Courses (OrganizationID, CourseTypeID, DateRequested, Location, StudentsRegistered, Notes, Status, CourseNumber)
             VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7) RETURNING *`,
            [organizationId, courseTypeId, dateRequested, location, registeredStudents, notes || null, finalCourseNumber]
        );

        res.status(201).json({ success: true, message: 'Course requested successfully!', course: result.rows[0] });
    } catch (err) {
        // Enhanced logging
        console.error('--- ERROR IN POST /api/courses/request ---');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Error Code:', err.code);
        console.error('Constraint:', err.constraint);
        console.error('Error Object:', err); 

        // Specific check for CourseNumber unique constraint violation (should be less likely now, but good fallback)
        if (err.code === '23505' && err.constraint === 'courses_coursenumber_key') {
            console.warn('Duplicate CourseNumber detected during course request.');
            return res.status(409).json({ success: false, message: 'A course with this generated number already exists. This might happen if requesting the same course type for the same org on the same day. Please try again or contact support.' });
        }
        
        // Handle other potential errors (like invalid OrgID/CourseTypeID from earlier checks - though unlikely here if inserts worked)
        if (err.code === '23503') { // Foreign key violation
             return res.status(400).json({ success: false, message: 'Invalid Organization or Course Type ID provided.'});
         }

        // Generic internal server error for other unexpected issues
        res.status(500).json({ success: false, message: 'Failed to request course due to a server error.' });
    }
});

// --- Admin: Get Instructor Dashboard Data ---
app.get('/api/admin/instructor-dashboard', authenticateToken, async (req, res) => {
    console.log('[API GET /admin/instructor-dashboard] START'); // <<< LOG
    try {
        console.log('[API GET /admin/instructor-dashboard] Querying instructors...'); // <<< LOG
        const instructorsRes = await pool.query(`
            SELECT i.InstructorID, u.UserID, u.FirstName, u.LastName 
            FROM Instructors i 
            JOIN Users u ON i.UserID = u.UserID
        `);
        const instructors = instructorsRes.rows;
        console.log(`[API GET /admin/instructor-dashboard] Found ${instructors.length} instructors.`); // <<< LOG

        console.log('[API GET /admin/instructor-dashboard] Querying availability...'); // <<< LOG
        const availabilityRes = await pool.query('SELECT InstructorID, AvailableDate FROM InstructorAvailability');
        const availability = availabilityRes.rows;
        console.log(`[API GET /admin/instructor-dashboard] Found ${availability.length} availability entries.`); // <<< LOG

        console.log('[API GET /admin/instructor-dashboard] Querying courses...'); // <<< LOG
        const coursesRes = await pool.query(`
            SELECT 
                c.CourseID, c.InstructorID, c.OrganizationID, c.DateScheduled, c.Location, 
                c.StudentsRegistered, c.Notes, c.Status, 
                c.CourseNumber, 
                ct.CourseTypeName,
                o.OrganizationName,
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as studentsattendance -- Added Attendance Count
            FROM Courses c
            LEFT JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            LEFT JOIN Students s ON c.CourseID = s.CourseID -- Join Students
            WHERE c.Status IN ('Scheduled', 'Completed') 
            -- Group by all non-aggregated columns
            GROUP BY c.CourseID, c.InstructorID, c.OrganizationID, c.DateScheduled, c.Location, 
                     c.StudentsRegistered, c.Notes, c.Status, c.CourseNumber, 
                     ct.CourseTypeName, o.OrganizationName
        `);
        const courses = coursesRes.rows;
        console.log(`[API GET /admin/instructor-dashboard] Found ${courses.length} courses.`); // <<< LOG

        console.log('[API GET /admin/instructor-dashboard] Processing data...'); // <<< LOG
        const dashboardData = [];

        instructors.forEach(inst => {
            // Add availability slots
            availability.filter(avail => avail.instructorid === inst.instructorid).forEach(avail => {
                // Check if ANY course (Scheduled OR Completed) exists for this instructor on this date
                const courseOnDate = courses.find(course => 
                    course.instructorid === inst.instructorid && 
                    course.datescheduled && // Ensure course has a date
                    new Date(course.datescheduled).toDateString() === new Date(avail.availabledate).toDateString()
                );

                // Only add if NO course (scheduled or completed) is found for this availability slot
                if (!courseOnDate) { 
                    dashboardData.push({
                        id: `avail-${inst.instructorid}-${avail.availabledate}`,
                        instructorName: `${inst.firstname} ${inst.lastname}`,
                        date: avail.availabledate,
                        status: 'Available',
                        organizationName: '-', 
                        location: '-',
                        studentsRegistered: '-',
                        studentsAttendance: '-', // Placeholder
                        notes: '-' 
                    });
                }
            });

            // Add scheduled/completed classes for this instructor
            courses.filter(course => course.instructorid === inst.instructorid).forEach(course => {
                dashboardData.push({
                    id: `course-${course.courseid}`,
                    instructorName: `${inst.firstname} ${inst.lastname}`,
                    date: course.datescheduled,
                    status: course.status, 
                    organizationName: course.organizationname,
                    location: course.location,
                    studentsRegistered: course.studentsregistered,
                    studentsAttendance: parseInt(course.studentsattendance || 0, 10), // Include Attendance Count
                    notes: course.notes,
                    coursenumber: course.coursenumber
                });
            });
        });

        // Sort the combined data (optional, e.g., by date then instructor)
        dashboardData.sort((a, b) => new Date(a.date) - new Date(b.date) || a.instructorName.localeCompare(b.instructorName));

        console.log('[API GET /admin/instructor-dashboard] Data processing complete.'); // <<< LOG
        
        res.json({ success: true, data: dashboardData });

    } catch (err) {
        console.error("[API GET /admin/instructor-dashboard] Error:", err); // <<< LOG ERROR
        res.status(500).json({ success: false, message: 'Failed to fetch instructor dashboard data' });
    }
    console.log('[API GET /admin/instructor-dashboard] END'); // <<< LOG
});

// --- Admin: Get Pending Courses ---
app.get('/api/admin/pending-courses', authenticateToken, async (req, res) => {
    try {
        // Query courses with 'Pending' status, joining with org and course type
        const result = await pool.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.DateRequested, c.CourseNumber, 
                c.Location, c.StudentsRegistered, c.Notes, c.Status,
                o.OrganizationName,
                ct.CourseTypeName
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            WHERE c.Status = 'Pending'
            ORDER BY c.DateRequested ASC -- Or DESC as preferred
        `);
        
        res.json({ success: true, courses: result.rows });

    } catch (err) {
        console.error("Error fetching pending courses:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch pending courses' });
    }
});

// --- Admin: Get Scheduled Courses ---
app.get('/api/admin/scheduled-courses', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.DateRequested, c.DateScheduled, c.CourseNumber, 
                c.Location, c.StudentsRegistered, c.Notes, c.Status,
                o.OrganizationName,
                ct.CourseTypeName,
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as studentsattendance 
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            LEFT JOIN Students s ON c.CourseID = s.CourseID -- Join Students
            WHERE c.Status = 'Scheduled'
            -- Group by all non-aggregated columns
            GROUP BY c.CourseID, o.OrganizationName, ct.CourseTypeName, u.FirstName, u.LastName 
            ORDER BY c.DateScheduled ASC -- Or other preferred order
        `);
        res.json({ success: true, courses: result.rows });
    } catch (err) {
        console.error("Error fetching scheduled courses:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch scheduled courses' });
    }
});

// --- Admin: Get Completed Courses ---
app.get('/api/admin/completed-courses', authenticateToken, async (req, res) => {
    try {
        // Select courses that are Completed, Billing Ready, or already Invoiced
        const result = await pool.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.DateScheduled, c.CourseNumber, 
                c.Location, c.StudentsRegistered, c.Notes, c.Status,
                o.OrganizationName,
                ct.CourseTypeName,
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
                (SELECT COUNT(*) FROM Students s WHERE s.CourseID = c.CourseID AND s.Attendance = TRUE) as studentsattendance
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            WHERE c.Status IN ('Completed', 'Billing Ready', 'Invoiced') -- <<< MODIFIED HERE
            ORDER BY c.DateScheduled DESC -- Or other preferred sorting
        `);
        
        // Parse count
        const courses = result.rows.map(course => ({
            ...course,
            studentsattendance: parseInt(course.studentsattendance, 10)
        }));

        res.json({ success: true, courses: courses });
    } catch (err) {
        console.error("Error fetching completed courses:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch completed courses' });
    }
});

// --- Admin/Org: Upload Students for a Course ---
app.post('/api/courses/:courseId/students', authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    const { students } = req.body; // Expecting an array of student objects [{firstName, lastName, email}]

    // Basic validation
    if (!students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ success: false, message: 'Student data is missing or invalid.' });
    }
    if (!courseId) {
         return res.status(400).json({ success: false, message: 'Course ID is missing.' });
    }

    // TODO: Add authorization check - ensure the user (Org or Admin) has rights to modify this course

    // Get a client from the pool for transaction using the correct export
    const client = await pool.connect(); // Use pool.connect()
    try {
        await client.query('BEGIN');

        // Optional: Delete existing students for this course before adding new ones?
        // await client.query('DELETE FROM Students WHERE CourseID = $1', [courseId]);

        let insertedCount = 0;
        for (const student of students) {
            if (!student.firstName || !student.lastName) {
                console.warn('Skipping student with missing name:', student);
                continue; 
            }
            
            // Use correct column names from schema
            const result = await client.query(
                `INSERT INTO Students (CourseID, FirstName, LastName, Email) 
                 VALUES ($1, $2, $3, $4)`,
                [courseId, student.firstName, student.lastName, student.email || null]
            );
            insertedCount += result.rowCount; 
        }

        // After inserting students, update the StudentsRegistered count on the course
        if (insertedCount > 0) {
            await client.query(
                'UPDATE Courses SET StudentsRegistered = $1, UpdatedAt = CURRENT_TIMESTAMP WHERE CourseID = $2',
                [insertedCount, courseId]
            );
            console.log(`[API POST /students] Updated Course ${courseId} StudentsRegistered count to ${insertedCount}`);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `${insertedCount} students uploaded successfully.` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error uploading students for course ${courseId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to upload students.' });
    } finally {
        client.release(); // Release the client back to the pool
    }
});

// --- Instructor: Get Today's Scheduled Classes ---
app.get('/api/instructor/todays-classes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userid;
        // Find InstructorID
        const instructorResult = await pool.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid;
        
        // Get current date in YYYY-MM-DD format (consider timezone)
        const today = new Date().toISOString().split('T')[0]; 

        const result = await pool.query(`
            SELECT 
                c.CourseID, c.DateScheduled, c.CourseNumber, c.Location, c.Status, 
                o.OrganizationName, ct.CourseTypeName, c.StudentsRegistered
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            WHERE c.InstructorID = $1 AND c.DateScheduled = $2 AND c.Status = 'Scheduled' 
            ORDER BY c.DateScheduled ASC
        `, [instructorId, today]);
        
        res.json({ success: true, classes: result.rows });

    } catch (err) {
        console.error("Error fetching today's classes:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch today\'s classes' });
    }
});

// --- Get Students for a Specific Course ---
app.get('/api/courses/:courseId/students', authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    try {
        // TODO: Add authorization check - ensure user (instructor/admin/org) can view students for this course
        const result = await pool.query(
            'SELECT StudentID, FirstName, LastName, Email, Attendance FROM Students WHERE CourseID = $1 ORDER BY LastName, FirstName',
            [courseId]
        );
        res.json({ success: true, students: result.rows });
    } catch (err) {
        console.error(`Error fetching students for course ${courseId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
});

// --- Instructor: Update Student Attendance ---
app.put('/api/students/:studentId/attendance', authenticateToken, async (req, res) => {
    const { studentId } = req.params;
    const { attended } = req.body;
    const userId = req.user?.userid; // Use optional chaining

    console.log(`[API PUT /students/${studentId}/attendance] Request received. Attended: ${attended}, UserID: ${userId}`);

    if (typeof attended !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Invalid attendance value provided.' });
    }
    if (!userId) {
         return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (isNaN(parseInt(studentId, 10))) {
        return res.status(400).json({ success: false, message: 'Invalid Student ID format.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get CourseID associated with the student
        const studentCourse = await client.query('SELECT CourseID FROM Students WHERE StudentID = $1', [studentId]);
        if (studentCourse.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }
        const courseId = studentCourse.rows[0].courseid;

        // Optional: Authorization Check - Is the user the assigned instructor for this course?
        // This requires fetching InstructorID for the user and comparing with Courses.InstructorID
        // For now, we'll allow any authenticated user (instructor) to update any student
        // In a real app, add role/assignment checks here.

        // 2. Update the student's attendance
        const updateResult = await client.query(
            'UPDATE Students SET Attendance = $1 WHERE StudentID = $2 RETURNING StudentID',
            [attended, studentId]
        );

        if (updateResult.rowCount === 0) {
            // Should not happen if student was found earlier, but safety check
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Student not found during update.' });
        }

        // 3. Calculate the new attendance count for the course
        const attendanceCountResult = await client.query(
            'SELECT COUNT(*) as count FROM Students WHERE CourseID = $1 AND Attendance = TRUE',
            [courseId]
        );
        const newAttendanceCount = parseInt(attendanceCountResult.rows[0].count, 10);

        await client.query('COMMIT');

        // 4. Emit socket event to notify clients (e.g., Admin Portal)
        console.log(`[API PUT /students/attendance] Emitting attendance_updated for Course ${courseId}. New Count: ${newAttendanceCount}`);
        io.emit('attendance_updated', { courseId: courseId, newAttendanceCount: newAttendanceCount });

        res.json({ success: true, message: 'Attendance updated successfully.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[API PUT /students/${studentId}/attendance] Error:`, err);
        res.status(500).json({ success: false, message: 'Failed to update attendance.' });
    } finally {
        client.release();
    }
});

// --- Instructor: Add Student during Attendance ---
app.post('/api/courses/:courseId/add-student', authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    const { firstName, lastName, email } = req.body; // Expecting { firstName, lastName, email? }

    if (!firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'First and last name are required.' });
    }
     if (!courseId) {
         return res.status(400).json({ success: false, message: 'Course ID is missing.' });
    }

    // TODO: Add authorization check - ensure instructor is assigned to this course

    try {
        // Insert student, potentially handle duplicates based on CourseID/Email if needed
        const result = await pool.query(
            `INSERT INTO Students (CourseID, FirstName, LastName, Email, Attendance) 
             VALUES ($1, $2, $3, $4, FALSE) -- Default attendance to false
             RETURNING *`,
            [courseId, firstName, lastName, email || null]
        );
        res.status(201).json({ success: true, message: 'Student added successfully.', student: result.rows[0] });
    } catch (err) {
        console.error(`Error adding student to course ${courseId}:`, err);
        // Handle potential duplicate errors if constraints exist
        if (err.code === '23505') { 
             return res.status(409).json({ success: false, message: 'Student with this email may already exist for this course.' });
        }
        res.status(500).json({ success: false, message: 'Failed to add student.' });
    }
});

// --- Instructor: Mark Course as Completed ---
app.put('/api/courses/:courseId/complete', authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user.userid;

    try {
        // Find InstructorID first
        const instructorResult = await pool.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid;

        // Update course status only if it belongs to this instructor and is 'Scheduled'
        const result = await pool.query(
            `UPDATE Courses SET Status = 'Completed', UpdatedAt = CURRENT_TIMESTAMP 
             WHERE CourseID = $1 AND InstructorID = $2 AND Status = 'Scheduled' RETURNING CourseID`,
            [courseId, instructorId]
        );

        if (result.rowCount === 0) {
            // Could be course not found, not assigned to this instructor, or not in 'Scheduled' status
            return res.status(404).json({ success: false, message: 'Course not found, not assigned to you, or not currently scheduled.' });
        }
        res.json({ success: true, message: 'Course marked as completed.' });

    } catch (err) {
        console.error(`Error completing course ${courseId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to mark course as completed.' });
    }
});

// --- Instructor: Get Completed Courses (Archive) ---
app.get('/api/instructor/completed-classes', authenticateToken, async (req, res) => {
     try {
        const userId = req.user.userid;
        const instructorResult = await pool.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid;

        const result = await pool.query(`
            SELECT 
                c.CourseID, c.DateScheduled, c.CourseNumber, c.Location, c.Status, 
                o.OrganizationName, ct.CourseTypeName, c.StudentsRegistered 
                -- Add attendance count later if needed
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            WHERE c.InstructorID = $1 AND c.Status = 'Completed'
            ORDER BY c.DateScheduled DESC
        `, [instructorId]);
        
        res.json({ success: true, courses: result.rows });

    } catch (err) {
        console.error("Error fetching completed classes:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch completed classes' });
    }
});

// --- Admin: Get All Instructors ---
app.get('/api/admin/instructors', authenticateToken, async (req, res) => {
    console.log('[API GET /admin/instructors] START'); // <<< LOG
    try {
        console.log('[API GET /admin/instructors] Querying database...'); // <<< LOG
        const result = await pool.query(`
            SELECT i.InstructorID, u.FirstName, u.LastName 
            FROM Instructors i 
            JOIN Users u ON i.UserID = u.UserID 
            ORDER BY u.LastName, u.FirstName
        `);
        console.log(`[API GET /admin/instructors] Query successful, found ${result.rows.length} instructors.`); // <<< LOG
        res.json({ success: true, instructors: result.rows });
    } catch (err) {
        console.error("[API GET /admin/instructors] Error:", err); // <<< LOG ERROR
        res.status(500).json({ success: false, message: 'Failed to fetch instructors' });
    }
    console.log('[API GET /admin/instructors] END'); // <<< LOG
});

// --- Admin: Get Instructor Workload Summary (Current Month) ---
app.get('/api/admin/instructor-workload', authenticateToken, async (req, res) => {
    console.log('[API GET /admin/instructor-workload] START'); // <<< LOG
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1; // JS months are 0-indexed

        // Use placeholders for date calculations for safety
        const firstDayOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
        const firstDayOfNextMonthDate = new Date(year, month, 1); // Month is 0-indexed here
        // Format first day of next month for query
        const nextMonthYear = firstDayOfNextMonthDate.getFullYear();
        const nextMonthMonth = firstDayOfNextMonthDate.getMonth() + 1;
        const firstDayOfNextMonth = `${nextMonthYear}-${String(nextMonthMonth).padStart(2, '0')}-01`;
        
        // Format today as YYYY-MM-DD for upcoming comparison
        const todayFormatted = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        console.log(`[Workload] Calculating for month starting: ${firstDayOfMonth}, ending before: ${firstDayOfNextMonth}, today: ${todayFormatted}`);

        console.log('[API GET /admin/instructor-workload] Querying database...'); // <<< LOG
        const result = await pool.query(`
            SELECT 
                i.InstructorID, 
                u.FirstName, 
                u.LastName,
                COALESCE(completed.count, 0) AS "completedThisMonth",
                COALESCE(scheduled.count, 0) AS "scheduledUpcomingThisMonth"
            FROM Instructors i
            JOIN Users u ON i.UserID = u.UserID
            -- Subquery for completed courses this month
            LEFT JOIN (
                SELECT InstructorID, COUNT(*) as count
                FROM Courses
                WHERE Status = 'Completed' 
                  AND DateScheduled >= $1 AND DateScheduled < $2
                GROUP BY InstructorID
            ) completed ON i.InstructorID = completed.InstructorID
            -- Subquery for scheduled upcoming courses this month
            LEFT JOIN (
                SELECT InstructorID, COUNT(*) as count
                FROM Courses
                WHERE Status = 'Scheduled' 
                  AND DateScheduled >= $3 -- From today onwards
                  AND DateScheduled < $2 -- Within the current month
                GROUP BY InstructorID
            ) scheduled ON i.InstructorID = scheduled.InstructorID
            ORDER BY u.LastName, u.FirstName;
        `, [firstDayOfMonth, firstDayOfNextMonth, todayFormatted]);
        console.log(`[API GET /admin/instructor-workload] Query successful.`); // <<< LOG

        console.log('[API GET /admin/instructor-workload] Mapping data...'); // <<< LOG
        const workloadData = result.rows.map(row => {
            const completed = parseInt(row.completedThisMonth || 0, 10);
            const scheduled = parseInt(row.scheduledUpcomingThisMonth || 0, 10);
            return {
                instructorId: row.instructorid,
                name: `${row.firstname} ${row.lastname}`,
                completedThisMonth: completed,
                scheduledUpcomingThisMonth: scheduled,
                totalWorkloadThisMonth: completed + scheduled // Calculate total
            };
        });
        console.log(`[API GET /admin/instructor-workload] Found workload for ${workloadData.length} instructors.`);
        
        res.json({ success: true, workload: workloadData });

    } catch (err) {
        console.error("[API GET /admin/instructor-workload] Error:", err); // <<< LOG ERROR
        res.status(500).json({ success: false, message: 'Failed to fetch instructor workload data.' });
    }
    console.log('[API GET /admin/instructor-workload] END'); // <<< LOG
});

// --- Admin: Schedule a Pending Course ---
app.put('/api/admin/schedule-course/:courseId', authenticateToken, async (req, res) => {
    const { courseId } = req.params;
    const { instructorId, dateScheduled } = req.body;

    if (!instructorId || !dateScheduled) {
        return res.status(400).json({ success: false, message: 'Instructor ID and Scheduled Date are required.' });
    }

    // Optional: Check if instructor is available on dateScheduled here if needed
    // Requires fetching instructor availability

    try {
        const result = await pool.query(
            `UPDATE Courses 
             SET InstructorID = $1, DateScheduled = $2, Status = 'Scheduled', UpdatedAt = CURRENT_TIMESTAMP 
             WHERE CourseID = $3 AND Status = 'Pending' 
             RETURNING *`, 
            [instructorId, dateScheduled, courseId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Pending course not found or could not be updated.' });
        }

        const updatedCourse = result.rows[0];

        // --- Emit WebSocket Event --- 
        try {
             // Find the UserID associated with the InstructorID
            const userRes = await pool.query('SELECT UserID FROM Instructors WHERE InstructorID = $1', [instructorId]);
            if (userRes.rows.length > 0) {
                const instructorUserId = userRes.rows[0].userid.toString(); // Ensure string key
                console.log(`[Schedule Course] Found Instructor UserID: ${instructorUserId}`); // Log UserID
                const targetSocketId = userSockets.get(instructorUserId);
                console.log(`[Schedule Course] Looked up socket ID for UserID ${instructorUserId}. Found: ${targetSocketId}`); // Log SocketID lookup result
                if (targetSocketId) {
                    console.log(`[Schedule Course] Emitting 'course_assigned' to Socket ${targetSocketId} for Course ${courseId}`);
                    io.to(targetSocketId).emit('course_assigned', updatedCourse);
                } else {
                     console.log(`[Schedule Course] Could not find active socket for Instructor UserID: ${instructorUserId}. Sockets map:`, userSockets);
                }
            } else {
                 console.log(`[Schedule Course] Could not find UserID for InstructorID: ${instructorId}`);
            }
        } catch (emitError) {
            console.error('[Schedule Course] Error querying user or emitting socket event:', emitError);
            // Don't fail the main request, just log the socket error
        }
        // --- End Emit WebSocket Event ---

        res.json({ success: true, message: 'Course scheduled successfully!', course: updatedCourse });

    } catch (err) {
        console.error(`Error scheduling course ${courseId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to schedule course.' });
    }
});

// --- Socket.IO Connection Handling (Enhanced Logging) ---
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Connection established: ${socket.id}`);

    socket.on('identify', (userId) => {
        try {
            if (!userId) {
                console.warn(`[Socket.IO] Identify event received with invalid userId from ${socket.id}`);
                return;
            }
            const userIdStr = userId.toString(); // Ensure string key
            console.log(`[Socket.IO] Socket ${socket.id} identified as UserID: ${userIdStr}`);
            userSockets.set(userIdStr, socket.id);
            console.log(`[Socket.IO] UserID ${userIdStr} added to map. Current map size: ${userSockets.size}`);
            socket.join(userIdStr); // Join room based on userId
        } catch (error) {
            console.error(`[Socket.IO] Error in 'identify' handler for socket ${socket.id}:`, error);
        }
    });

    socket.on('disconnect', (reason) => {
        try {
            console.log(`[Socket.IO] Socket disconnected: ${socket.id}, Reason: ${reason}`);
            let userIdToRemove = null;
            for (const [userId, socketId] of userSockets.entries()) {
                if (socketId === socket.id) {
                    userIdToRemove = userId;
                    break;
                }
            }
            if (userIdToRemove !== null) {
                userSockets.delete(userIdToRemove);
                console.log(`[Socket.IO] Removed UserID ${userIdToRemove} from socket map. Current map size: ${userSockets.size}`);
            } else {
                console.log(`[Socket.IO] Disconnected socket ${socket.id} not found in map.`);
            }
        } catch (error) {
             console.error(`[Socket.IO] Error in 'disconnect' handler for socket ${socket.id}:`, error);
        }
    });

    socket.on('error', (err) => {
        console.error(`[Socket.IO] Error on socket ${socket.id}:`, err);
    });
});
console.log('[Server Start] Socket.IO connection handler attached.'); // <<< ADD LOG
// --- End Socket.IO --- 

// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
  console.error('<<<<< [FATAL] Uncaught Exception Caught! >>>>>'); // Make it stand out
  console.error('Timestamp:', new Date().toISOString());
  console.error(`Error Message: ${err?.message || 'No message'}`);
  console.error('Origin:', origin);
  console.error('Stack Trace:', err?.stack || 'No stack trace');
  console.error('<<<<< END Uncaught Exception >>>>>');
  // Optionally force exit if needed, but logging is key
  // process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('<<<<< [FATAL] Unhandled Rejection Caught! >>>>>'); // Make it stand out
  console.error('Timestamp:', new Date().toISOString());
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('<<<<< END Unhandled Rejection >>>>>');
  // Optionally force exit
  // process.exit(1); 
});
console.log('[Server Start] Global error handlers attached.');

// --- Start Server ---
const port = process.env.PORT || 3001; // Define port here, default to 3001
console.log(`[Server Start] Attempting to listen on port ${port}...`); // <<< ADD LOG

try {
  console.log(`Attempting to start server on port ${port}...`);
  server.listen(port, '0.0.0.0', () => { 
    console.log(`---> Server successfully running on port ${port} <---`);
    console.log('Ready for connections.');
  });
} catch (listenError) {
  console.error(`[FATAL] Failed to start server listening on port ${port}:`, listenError);
  // process.exit(1); // Exit if server cannot start
}

// Ensure the duplicate app.listen is removed/commented
// app.listen(port, '0.0.0.0', () => { ... });

// Remove any trailing characters/lines (ensure this is the end of the file)

// --- Admin Reports Endpoints ---

// GET /api/admin/reports/instructor-workload
app.get('/api/admin/reports/instructor-workload', authenticateToken, checkAdminOrSuperAdmin, async (req, res) => {
    // Get optional date range from query parameters
    let { startDate, endDate } = req.query;
    console.log(`[API GET /reports/instructor-workload] Request received. Range: ${startDate} to ${endDate}`);

    // Basic validation or default date range (e.g., current month)
    if (!startDate || !endDate) {
        // Example: Default to current month if dates aren't provided
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        startDate = new Date(year, month, 1).toISOString().split('T')[0];
        endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
        console.log(`[API GET /reports/instructor-workload] No date range provided, defaulting to: ${startDate} to ${endDate}`);
    }
    // Add further date validation if needed

    try {
        const query = `
            SELECT
                i.InstructorID,
                u.FirstName,
                u.LastName,
                COALESCE(completed.count, 0) AS "completedCount",
                COALESCE(scheduled.count, 0) AS "scheduledCount"
            FROM Instructors i
            JOIN Users u ON i.UserID = u.UserID
            -- Subquery for completed courses in range
            LEFT JOIN (
                SELECT InstructorID, COUNT(*) as count
                FROM Courses
                WHERE Status = 'Completed'
                  AND DateScheduled >= $1 AND DateScheduled <= $2
                GROUP BY InstructorID
            ) completed ON i.InstructorID = completed.InstructorID
            -- Subquery for scheduled courses in range
            LEFT JOIN (
                SELECT InstructorID, COUNT(*) as count
                FROM Courses
                WHERE Status = 'Scheduled'
                  AND DateScheduled >= $1 AND DateScheduled <= $2
                GROUP BY InstructorID
            ) scheduled ON i.InstructorID = scheduled.InstructorID
            ORDER BY u.LastName, u.FirstName;
        `;

        const result = await pool.query(query, [startDate, endDate]);

        const reportData = result.rows.map(row => ({
            instructorId: row.instructorid,
            name: `${row.firstname} ${row.lastname}`,
            completedCount: parseInt(row.completedCount, 10),
            scheduledCount: parseInt(row.scheduledCount, 10)
        }));

        console.log(`[API GET /reports/instructor-workload] Generated report for ${reportData.length} instructors.`);
        res.json({ success: true, reportData: reportData });

    } catch (err) {
        console.error("[API GET /reports/instructor-workload] Error:", err);
        res.status(500).json({ success: false, message: 'Failed to generate Instructor Workload report.' });
    }
});

// TODO: Add /api/admin/reports/course-scheduling endpoint later
