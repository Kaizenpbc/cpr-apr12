const express = require('express');
const cors = require('cors');
const db = require('./db');
const http = require('http'); // Import Node's http module
const { Server } = require("socket.io"); // Import socket.io Server

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app
// Attach socket.io to the HTTP server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow frontend origin
    methods: ["GET", "POST", "PUT", "DELETE"] // Allowed methods
  }
});

const port = process.env.PORT || 3001;

// Simple in-memory store for user sockets (Replace with Redis/DB in production)
const userSockets = new Map(); 

app.use(cors());
app.use(express.json());

// Authentication middleware - Make it async to query DB
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
        // Assume token is the UserID for now
        const userId = token;
        req.user = { userid: userId }; // Set basic user info

        // Query to find associated OrganizationID based on UserID
        // Adjust the table and column names if your schema is different
        const orgQueryResult = await db.query(
            'SELECT OrganizationID FROM Users WHERE UserID = $1',
            [userId]
        );

        if (orgQueryResult.rows.length > 0 && orgQueryResult.rows[0].organizationid) {
            // If an OrganizationID is found for this user, add it to req.user
            req.user.organizationId = orgQueryResult.rows[0].organizationid;
        }
        // If no OrgID found, req.user.organizationId will remain undefined.
        // Route-specific checks (like in /api/courses/request) will handle authorization.

        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        console.error('Authentication error:', err);
        return res.status(500).json({ success: false, message: 'Internal error during authentication' });
    }
};

// Test database connection
app.get('/api/test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ success: true, timestamp: result.rows[0].now });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const result = await db.query(
            'SELECT UserID, Username, Role, FirstName, LastName, OrganizationID FROM Users WHERE Username = $1 AND Password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = user.userid.toString();
            
            res.json({ 
                success: true, 
                user: {
                    userid: user.userid,
                    username: user.username,
                    role: user.role,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    organizationId: user.organizationid
                },
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
        const result = await db.query(`
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
        const courseResult = await db.query(`
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

        const studentsResult = await db.query(`
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
        const result = await db.query(`
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
        const result = await db.query(`
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

// Instructor Availability Endpoints
app.post('/api/instructor/availability', authenticateToken, async (req, res) => {
    try {
        const { date } = req.body;
        const userId = req.user.userid; // Get the UserID from the token/middleware

        // 1. Find the InstructorID based on the UserID
        const instructorResult = await db.query(
            'SELECT InstructorID FROM Instructors WHERE UserID = $1',
            [userId]
        );

        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid; // Correct InstructorID

        // 2. Insert using the correct InstructorID
        const result = await db.query(
            'INSERT INTO InstructorAvailability (InstructorID, AvailableDate) VALUES ($1, $2) RETURNING *',
            [instructorId, date] // Use the fetched instructorId
        );

        res.status(201).json({ success: true, message: 'Availability added successfully' }); // Use 201 for successful creation
    } catch (error) {
        console.error('Error adding availability:', error);
        // Check for potential duplicate entry error (unique constraint violation)
        if (error.code === '23505') { // PostgreSQL unique violation code
            return res.status(409).json({ success: false, message: 'Date already marked as available' });
        }
        res.status(500).json({ success: false, message: 'Failed to add availability' });
    }
});

app.delete('/api/instructor/availability/:date', authenticateToken, async (req, res) => {
    try {
        const { date } = req.params;
        const userId = req.user.userid; // Get the UserID from the token/middleware

        // 1. Find the InstructorID based on the UserID
        const instructorResult = await db.query(
            'SELECT InstructorID FROM Instructors WHERE UserID = $1',
            [userId]
        );

        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid; // Correct InstructorID

        // 2. Delete using the correct InstructorID
        const deleteResult = await db.query(
            'DELETE FROM InstructorAvailability WHERE InstructorID = $1 AND AvailableDate = $2',
            [instructorId, date] // Use the fetched instructorId
        );

        // Check if any row was actually deleted
        if (deleteResult.rowCount > 0) {
            res.json({ success: true, message: 'Availability removed successfully' });
        } else {
            // Optionally, you could return a 404 if the date wasn't found for this instructor
            res.status(404).json({ success: false, message: 'Availability date not found for this instructor' });
        }
    } catch (error) {
        console.error('Error removing availability:', error);
        res.status(500).json({ success: false, message: 'Failed to remove availability' });
    }
});

app.get('/api/instructor/availability', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userid; // Get the UserID from the token/middleware

        // 1. Find the InstructorID based on the UserID
        const instructorResult = await db.query(
            'SELECT InstructorID FROM Instructors WHERE UserID = $1',
            [userId]
        );

        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid; // Correct InstructorID

        // 2. Fetch availability using the correct InstructorID
        const result = await db.query(
            'SELECT AvailableDate FROM InstructorAvailability WHERE InstructorID = $1',
            [instructorId] // Use the fetched instructorId
        );

        // Directly return the array of dates as expected by the frontend
        res.json(result.rows.map(row => row.availabledate));
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch availability' });
    }
});

// Scheduled Classes Endpoints (Corrected for Instructor Portal)
app.get('/api/instructor/classes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userid; // Get UserID
        // 1. Find InstructorID
        const instructorResult = await db.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (instructorResult.rows.length === 0) {
            return res.json({ success: true, classes: [] }); // Return empty if not an instructor
        }
        const instructorId = instructorResult.rows[0].instructorid;

        // 2. Query Courses table for this instructor where status is Scheduled
        const result = await db.query(`
            SELECT 
                c.CourseID, c.CourseNumber, c.DateScheduled, c.Location, c.Status,
                c.StudentsRegistered,
                c.Notes, 
                o.OrganizationName, 
                ct.CourseTypeName,
                -- Calculate actual attendance count
                COUNT(CASE WHEN s.Attendance = TRUE THEN 1 END) as StudentsAttendance
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            -- Join Students table to count attendance
            LEFT JOIN Students s ON c.CourseID = s.CourseID 
            WHERE c.InstructorID = $1 AND c.Status = 'Scheduled'
            -- Group by all non-aggregated columns
            GROUP BY c.CourseID, c.CourseNumber, c.DateScheduled, c.Location, c.Status, 
                     c.StudentsRegistered, c.Notes, o.OrganizationName, ct.CourseTypeName
            ORDER BY c.DateScheduled ASC 
        `, [instructorId]);

        res.json({ success: true, classes: result.rows });
    } catch (error) {
        console.error('Error fetching instructor scheduled classes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch scheduled classes' });
    }
});

app.post('/api/instructor/classes', authenticateToken, async (req, res) => {
    try {
        const {
            organizationId,
            classDate,
            location,
            classType,
            notes
        } = req.body;
        const instructorId = req.user.userid;

        const result = await db.query(`
            INSERT INTO scheduledclasses (
                instructorid,
                organizationid,
                classdate,
                location,
                classtype,
                notes,
                status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'Scheduled')
            RETURNING *
        `, [instructorId, organizationId, classDate, location, classType, notes]);

        res.json({ success: true, message: 'Class scheduled successfully' });
    } catch (error) {
        console.error('Error scheduling class:', error);
        res.status(500).json({ success: false, message: 'Failed to schedule class' });
    }
});

// --- Course Types Endpoint ---
app.get('/api/course-types', async (req, res) => {
    try {
        const result = await db.query('SELECT CourseTypeID, CourseTypeName FROM CourseTypes ORDER BY CourseTypeName');
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
        // Query for Organization NAME instead of non-existent code
        const orgResult = await db.query('SELECT OrganizationName FROM Organizations WHERE OrganizationID = $1', [organizationId]);
        
        // Query for CourseType NAME instead of non-existent code
        const typeResult = await db.query('SELECT CourseTypeName FROM CourseTypes WHERE CourseTypeID = $1', [courseTypeId]);
        
        if (orgResult.rows.length === 0 || typeResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid Organization or Course Type ID' });
        }
        
        const datePart = new Date(dateRequested).toISOString().slice(0, 10).replace(/-/g, '');
        const orgPart = orgResult.rows[0].organizationname.substring(0, 3).toUpperCase();
        // Use first 3 chars of CourseType NAME for the code part
        const typePart = typeResult.rows[0].coursetypename.substring(0, 3).toUpperCase();
        const courseNumber = `${datePart}-${orgPart}-${typePart}`;

        const result = await db.query(
            `INSERT INTO Courses (OrganizationID, CourseTypeID, DateRequested, Location, StudentsRegistered, Notes, Status, CourseNumber)
             VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7) RETURNING *`,
            [organizationId, courseTypeId, dateRequested, location, registeredStudents, notes || null, courseNumber]
        );

        res.status(201).json({ success: true, message: 'Course requested successfully!', course: result.rows[0] });
    } catch (err) {
        // Enhanced logging
        console.error('--- ERROR IN POST /api/courses/request ---');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Error Type:', typeof err);
        console.error('Error Object:', err); // Log the full error object
        if (err instanceof Error) {
            console.error('Error Stack:', err.stack); // Log stack trace if it's an Error instance
        }
        console.error('--- END ERROR DETAILS ---');
        
        res.status(500).json({ success: false, message: 'Failed to request course' });
    }
});

// --- Admin: Get Instructor Dashboard Data ---
app.get('/api/admin/instructor-dashboard', authenticateToken, async (req, res) => {
    // Optional: Add role check here if needed
    // if (req.user.role !== 'Admin') { 
    //     return res.status(403).json({ success: false, message: 'Unauthorized' });
    // }

    try {
        // 1. Get all Instructors
        const instructorsRes = await db.query(`
            SELECT i.InstructorID, u.UserID, u.FirstName, u.LastName 
            FROM Instructors i 
            JOIN Users u ON i.UserID = u.UserID
        `);
        const instructors = instructorsRes.rows;

        // 2. Get all Availability
        const availabilityRes = await db.query('SELECT InstructorID, AvailableDate FROM InstructorAvailability');
        const availability = availabilityRes.rows;

        // 3. Get all Scheduled Courses with Org info
        const coursesRes = await db.query(`
            SELECT 
                c.CourseID, c.InstructorID, c.OrganizationID, c.DateScheduled, c.Location, 
                c.StudentsRegistered, c.Notes, c.Status, ct.CourseTypeName,
                o.OrganizationName
            FROM Courses c
            LEFT JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            WHERE c.Status IN ('Scheduled', 'Completed') -- Only fetch relevant courses
        `);
        const courses = coursesRes.rows;

        // 4. Combine the data
        const dashboardData = [];

        instructors.forEach(inst => {
            // Add availability slots
            availability.filter(avail => avail.instructorid === inst.instructorid).forEach(avail => {
                // Check if a course is scheduled for this instructor on this date
                const scheduledCourse = courses.find(course => 
                    course.instructorid === inst.instructorid && 
                    new Date(course.datescheduled).toDateString() === new Date(avail.availabledate).toDateString()
                );

                if (!scheduledCourse) { // Only add if no course is scheduled for this availability slot
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
                    status: course.status, // Scheduled or Completed
                    organizationName: course.organizationname,
                    location: course.location,
                    studentsRegistered: course.studentsregistered,
                    studentsAttendance: '-', // Placeholder
                    notes: course.notes
                });
            });
        });

        // Sort the combined data (optional, e.g., by date then instructor)
        dashboardData.sort((a, b) => new Date(a.date) - new Date(b.date) || a.instructorName.localeCompare(b.instructorName));

        res.json({ success: true, data: dashboardData });

    } catch (err) {
        console.error("Error fetching instructor dashboard data:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch instructor dashboard data' });
    }
});

// --- Admin: Get Pending Courses ---
app.get('/api/admin/pending-courses', authenticateToken, async (req, res) => {
    try {
        // Query courses with 'Pending' status, joining with org and course type
        const result = await db.query(`
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
        const result = await db.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.DateRequested, c.DateScheduled, c.CourseNumber, 
                c.Location, c.StudentsRegistered, c.Notes, c.Status,
                o.OrganizationName,
                ct.CourseTypeName,
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            WHERE c.Status = 'Scheduled'
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
        const result = await db.query(`
            SELECT 
                c.CourseID, c.CreatedAt AS SystemDate, c.DateRequested, c.DateScheduled, c.CourseNumber, 
                c.Location, c.StudentsRegistered, c.Notes, c.Status, 
                o.OrganizationName,
                ct.CourseTypeName,
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName
                -- TODO: Add Students Attendance data later when available
            FROM Courses c
            JOIN Organizations o ON c.OrganizationID = o.OrganizationID
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            WHERE c.Status = 'Completed'
            ORDER BY c.DateScheduled DESC -- Or other preferred order
        `);
        res.json({ success: true, courses: result.rows });
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
    const client = await db.pool.connect(); // Use db.pool.connect()
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
        const instructorResult = await db.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid;
        
        // Get current date in YYYY-MM-DD format (consider timezone)
        const today = new Date().toISOString().split('T')[0]; 

        const result = await db.query(`
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
        const result = await db.query(
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
    const { attended } = req.body; // Expecting { attended: boolean }

    if (typeof attended !== 'boolean') {
         return res.status(400).json({ success: false, message: 'Invalid attendance value provided.' });
    }

    const client = await db.pool.connect(); // Get client for transaction
    try {
        await client.query('BEGIN');
        
        // 1. Update the specific student's attendance
        const updateResult = await client.query(
            'UPDATE Students SET Attendance = $1, UpdatedAt = CURRENT_TIMESTAMP WHERE StudentID = $2 RETURNING CourseID',
            [attended, studentId]
        );

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const courseId = updateResult.rows[0].courseid;

        // 2. Recalculate the total attendance for the course
        const attendanceCountResult = await client.query(
            'SELECT COUNT(*) FROM Students WHERE CourseID = $1 AND Attendance = TRUE',
            [courseId]
        );
        const newAttendanceCount = parseInt(attendanceCountResult.rows[0].count, 10);

        await client.query('COMMIT');

        // --- Emit WebSocket Event --- 
        // Emit to all connected sockets (or could target Admins specifically if needed)
        // For simplicity, emitting broadly for now.
        console.log(`Emitting 'attendance_updated' for Course ${courseId} with count ${newAttendanceCount}`);
        io.emit('attendance_updated', { courseId: courseId, newAttendanceCount: newAttendanceCount });
        // --- End Emit WebSocket Event ---

        res.json({ success: true, message: 'Attendance updated.', newAttendanceCount: newAttendanceCount });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error updating attendance for student ${studentId}:`, err);
        res.status(500).json({ success: false, message: 'Failed to update attendance.' });
    } finally {
        client.release();
    }
});

// --- Instructor: Add Student to Course (During Attendance) ---
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
        const result = await db.query(
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
        const instructorResult = await db.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid;

        // Update course status only if it belongs to this instructor and is 'Scheduled'
        const result = await db.query(
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
        const instructorResult = await db.query('SELECT InstructorID FROM Instructors WHERE UserID = $1', [userId]);
        if (instructorResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'User is not an instructor' });
        }
        const instructorId = instructorResult.rows[0].instructorid;

        const result = await db.query(`
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
    try {
        const result = await db.query(`
            SELECT i.InstructorID, u.FirstName, u.LastName 
            FROM Instructors i 
            JOIN Users u ON i.UserID = u.UserID 
            ORDER BY u.LastName, u.FirstName
        `);
        res.json({ success: true, instructors: result.rows });
    } catch (err) {
        console.error("Error fetching instructors:", err);
        res.status(500).json({ success: false, message: 'Failed to fetch instructors' });
    }
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
        const result = await db.query(
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
            const userRes = await db.query('SELECT UserID FROM Instructors WHERE InstructorID = $1', [instructorId]);
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

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Handler for client identifying itself (e.g., after login)
  socket.on('identify', (userId) => {
    if (userId) {
      console.log(`Socket ${socket.id} identified as UserID: ${userId}`);
      userSockets.set(userId.toString(), socket.id); // Store mapping (ensure userId is string)
      // console.log('Current user sockets:', userSockets);
    } else {
       console.log(`Socket ${socket.id} tried to identify without userId.`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    // Find and remove user from mapping on disconnect
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`Removed UserID ${userId} from socket map.`);
        break;
      }
    }
    // console.log('Current user sockets:', userSockets);
  });
});
// --- End Socket.IO --- 

// Start the HTTP server instead of the Express app directly
server.listen(port, () => { // Changed from app.listen to server.listen
    console.log(`Server running on port ${port}`);
}); 