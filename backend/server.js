const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3001;

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
app.get('/api/organizations/:id/courses', async (req, res) => {
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
                CONCAT(u.FirstName, ' ', u.LastName) as InstructorName,
                COUNT(s.StudentID) as StudentCount
            FROM Courses c
            JOIN CourseTypes ct ON c.CourseTypeID = ct.CourseTypeID
            LEFT JOIN Instructors i ON c.InstructorID = i.InstructorID
            LEFT JOIN Users u ON i.UserID = u.UserID
            LEFT JOIN Students s ON c.CourseID = s.CourseID
            WHERE c.OrganizationID = $1
            GROUP BY 
                c.CourseID,
                c.CourseNumber,
                ct.CourseTypeName,
                u.FirstName,
                u.LastName
            ORDER BY c.DateRequested DESC
        `, [req.params.id]);
        
        res.json({ success: true, courses: result.rows });
    } catch (err) {
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

// Scheduled Classes Endpoints
app.get('/api/instructor/classes', authenticateToken, async (req, res) => {
    try {
        const instructorId = req.user.userid;

        const result = await db.query(`
            SELECT 
                sc.*,
                o.organizationname as "organizationName"
            FROM scheduledclasses sc
            JOIN organizations o ON sc.organizationid = o.organizationid
            WHERE sc.instructorid = $1
            ORDER BY sc.classdate DESC
        `, [instructorId]);

        res.json({ success: true, classes: result.rows });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch classes' });
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 