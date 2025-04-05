-- Insert test organizations
INSERT INTO Organizations (OrganizationName, ContactName, ContactEmail, ContactPhone) VALUES
('Seneca College', 'Robert Brown', 'rbrown@seneca.ca', '416-555-0101'),
('Humber College', 'Patricia Lee', 'plee@humber.ca', '416-555-0102'),
('George Brown College', 'Michael Chen', 'mchen@georgebrown.ca', '416-555-0103'),
('Centennial College', 'Sarah Davis', 'sdavis@centennial.ca', '416-555-0104');

-- Update organization IDs for existing users
UPDATE Users SET OrganizationID = 1 WHERE Username = 'orgadmin';

-- Create instructor records for the instructor user
INSERT INTO Instructors (UserID, Availability, Certifications) VALUES
(
    (SELECT UserID FROM Users WHERE Username = 'instructor'),
    '{"schedule": {"monday": true, "tuesday": true, "wednesday": true, "thursday": true, "friday": true}}',
    ARRAY['BLS Instructor', 'ACLS Instructor', 'PALS Instructor']
);

-- Insert some courses (both upcoming and past)
INSERT INTO Courses (
    CourseNumber, 
    OrganizationID, 
    InstructorID, 
    CourseTypeID, 
    DateRequested, 
    DateScheduled, 
    Location, 
    StudentsRegistered,
    Status
) VALUES
-- Completed courses
(
    'CPR-2024-001',
    1, -- Seneca
    1, -- Our test instructor
    1, -- Basic Life Support
    '2024-03-01',
    '2024-03-15',
    'Seneca College - Room 301',
    10,
    'Completed'
),
(
    'CPR-2024-002',
    2, -- Humber
    1, -- Our test instructor
    2, -- HeartSaver CPR/AED
    '2024-03-05',
    '2024-03-20',
    'Humber College - Health Sciences Building',
    12,
    'Completed'
),
-- Upcoming courses
(
    'CPR-2024-003',
    3, -- George Brown
    1, -- Our test instructor
    3, -- Advanced Cardiac Life Support
    '2024-04-01',
    '2024-04-20',
    'George Brown College - Waterfront Campus',
    8,
    'Scheduled'
),
(
    'CPR-2024-004',
    4, -- Centennial
    1, -- Our test instructor
    4, -- Pediatric Advanced Life Support
    '2024-04-05',
    '2024-04-25',
    'Centennial College - Morningside Campus',
    6,
    'Scheduled'
),
-- Pending courses
(
    'CPR-2024-005',
    1, -- Seneca
    NULL, -- No instructor assigned yet
    1, -- Basic Life Support
    '2024-04-10',
    NULL,
    'Seneca College - Room 401',
    15,
    'Pending'
);

-- Insert test students for the completed and scheduled courses
INSERT INTO Students (CourseID, FirstName, LastName, Email, Attendance) VALUES
-- Students for CPR-2024-001 (Completed course)
(1, 'John', 'Smith', 'john.smith@student.seneca.ca', true),
(1, 'Emma', 'Johnson', 'emma.johnson@student.seneca.ca', true),
(1, 'Michael', 'Williams', 'michael.williams@student.seneca.ca', true),
-- Students for CPR-2024-002 (Completed course)
(2, 'Sophia', 'Brown', 'sophia.brown@student.humber.ca', true),
(2, 'William', 'Jones', 'william.jones@student.humber.ca', true),
(2, 'Olivia', 'Garcia', 'olivia.garcia@student.humber.ca', false),
-- Students for CPR-2024-003 (Upcoming course)
(3, 'James', 'Miller', 'james.miller@student.georgebrown.ca', false),
(3, 'Ava', 'Davis', 'ava.davis@student.georgebrown.ca', false),
(3, 'Alexander', 'Martinez', 'alexander.martinez@student.georgebrown.ca', false),
-- Students for CPR-2024-004 (Upcoming course)
(4, 'Isabella', 'Anderson', 'isabella.anderson@student.centennial.ca', false),
(4, 'Ethan', 'Taylor', 'ethan.taylor@student.centennial.ca', false),
(4, 'Mia', 'Thomas', 'mia.thomas@student.centennial.ca', false);

-- Insert invoices for completed courses
INSERT INTO Invoices (
    CourseID,
    InvoiceNumber,
    InvoiceDate,
    Amount,
    PaymentStatus,
    DueDate
) VALUES
(1, 'INV-2024-001', '2024-03-16', 1200.00, 'Paid', '2024-04-15'),
(2, 'INV-2024-002', '2024-03-21', 1500.00, 'Pending', '2024-04-20'); 