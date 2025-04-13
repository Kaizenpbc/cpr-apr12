-- Drop existing tables in reverse order of creation due to dependencies
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS instructor_availability CASCADE;
DROP TABLE IF EXISTS scheduled_classes CASCADE;
DROP TABLE IF EXISTS organization_course_pricing CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS course_types CASCADE;
DROP TABLE IF EXISTS instructors CASCADE;
DROP TABLE IF EXISTS users CASCADE; -- Depends on organizations
DROP TABLE IF EXISTS organizations CASCADE;

-- Create users table
CREATE TABLE users (
    userid SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Instructor', 'Organization', 'Admin', 'Accounting', 'SuperAdmin')),
    firstname VARCHAR(255),
    lastname VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    organization_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) -- Commented out: Defined later
);

-- Create organizations table
CREATE TABLE organizations (
    organization_id SERIAL PRIMARY KEY,
    organization_name VARCHAR(255) UNIQUE NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    -- New Address Fields
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_province VARCHAR(50), -- Or CHAR(2) depending on standard
    address_postal_code VARCHAR(10),
    -- MainPhone VARCHAR(20), -- Removed
    -- New CEO Fields
    ceo_name VARCHAR(255),
    ceo_phone VARCHAR(20),
    ceo_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to users table (Moved Here - After organizations is created)
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_organization;
ALTER TABLE users 
ADD CONSTRAINT fk_organization 
FOREIGN KEY (organization_id) 
REFERENCES organizations(organization_id);

-- Insert Default Organizations (Re-added)
INSERT INTO organizations (organization_name, contact_name, contact_email, contact_phone, address_street, address_city, address_province, address_postal_code, ceo_name, ceo_email, ceo_phone) VALUES
('Seneca College', 'Admin Contact', 'contact@seneca.ca', '416-491-5050', '1750 Finch Ave E', 'North York', 'ON', 'M2J 2X5', 'David Agnew', 'david.agnew@senecacollege.ca', '416-491-5050'),
('Default Client Inc.', 'Default Contact', 'contact@default.com', '905-555-1234', '1 Default St', 'Default City', 'ON', 'L1L 1L1', 'Mr. Default', 'ceo@default.com', '905-555-1111');

-- Create instructors table
CREATE TABLE instructors (
    instructor_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(userid) ON DELETE CASCADE,
    availability JSON,
    certifications TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create course_types table
CREATE TABLE course_types (
    course_type_id SERIAL PRIMARY KEY,
    course_type_name VARCHAR(255) UNIQUE NOT NULL,
    course_code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    duration INT, -- Duration in hours
    max_students INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create organization_course_pricing table
CREATE TABLE organization_course_pricing (
    pricing_id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL,
    course_type_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE, -- Cascade delete if org is deleted
    FOREIGN KEY (course_type_id) REFERENCES course_types(course_type_id) ON DELETE CASCADE, -- Cascade delete if course type is deleted
    UNIQUE (organization_id, course_type_id) -- Prevent duplicate price for same org/course type combo
);

-- Create courses table
CREATE TABLE courses (
    course_id SERIAL PRIMARY KEY,
    course_number VARCHAR(50) UNIQUE NOT NULL,
    organization_id INT NOT NULL,
    instructor_id INT,
    course_type_id INT NOT NULL,
    date_requested DATE NOT NULL,
    date_scheduled DATE,
    location VARCHAR(255),
    students_registered INT DEFAULT 0,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' 
        CHECK (status IN ('Pending', 'Scheduled', 'Completed', 'Cancelled', 'Billing Ready', 'Invoiced')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id),
    FOREIGN KEY (course_type_id) REFERENCES course_types(course_type_id)
);

-- Create students table
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    attendance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- Create invoices table
CREATE TABLE invoices (
    invoice_id SERIAL PRIMARY KEY,
    course_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending'
        CHECK (payment_status IN ('Pending', 'Paid', 'Overdue')),
    due_date DATE NOT NULL,
    email_sent_at TIMESTAMP NULL, -- Added column to track email sending
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

-- Create payments table to track individual payments against invoices
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- e.g., 'Check', 'EFT', 'Credit Card'
    reference_number VARCHAR(100), -- e.g., Check number, transaction ID
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Optional: Could add RecordedByUserID referencing users(userid)
    FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE
);

-- Create instructor_availability table (Restored)
CREATE TABLE instructor_availability (
    availability_id SERIAL PRIMARY KEY,
    instructor_id INT NOT NULL, -- Should reference users(userid)
    available_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Re-add Foreign Key constraint (assuming users table exists before this)
    FOREIGN KEY (instructor_id) REFERENCES users(userid) ON DELETE CASCADE, 
    UNIQUE (instructor_id, available_date) -- Use standard UNIQUE constraint
);

-- Create scheduled_classes table (Restored)
CREATE TABLE scheduled_classes (
    class_id SERIAL PRIMARY KEY,
    instructor_id INT NOT NULL,
    organization_id INT NOT NULL,
    class_date DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    class_type VARCHAR(50) NOT NULL, -- Refers to CourseType Name/Code conceptually?
    registered_students INT DEFAULT 0,
    attendance INT DEFAULT 0, -- Consider linking to students table instead?
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Available' CHECK (status IN ('Available', 'Scheduled')), -- Corrected syntax
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES users(userid) ON DELETE CASCADE, 
    FOREIGN KEY (organization_id) REFERENCES organizations(organization_id) ON DELETE CASCADE
);

-- Insert default course types based *only* on user provided list
-- Remove any previously existing default CourseType inserts first
DELETE FROM course_types; -- Simple clear, assumes init-db runs DROP TABLE first anyway
INSERT INTO course_types (course_type_name, course_code, description, duration, max_students) VALUES
('First Aid and CPR Level A', 'FACA', NULL, NULL, NULL),
('First Aid and CPR Level C', 'FACC', NULL, NULL, NULL),
('Basic Life Support (BLS)', 'BLS', NULL, NULL, NULL),
('WHMIS Training & Certification', 'WHMIS', NULL, NULL, NULL),
('Mask Fit Test & Certification', 'MASK', NULL, NULL, NULL);

-- Insert test users
INSERT INTO users (username, password, role, firstname, lastname, email, phone, organization_id) VALUES
('instructor', 'test123', 'Instructor', 'John', 'Doe', 'instructor@example.com', NULL, NULL),
('orgadmin', 'test123', 'Organization', 'Jane', 'Smith', 'orgadmin@example.com', NULL, 1), -- Link orgadmin to Org ID 1
('courseadmin', 'test123', 'Admin', 'Michael', 'Johnson', 'michael.j@example.com', NULL, NULL),
('actadmin', 'test123', 'Accounting', 'Sarah', 'Wilson', 'actadmin@example.com', NULL, NULL);

-- Insert default SuperAdmin user
INSERT INTO users (username, password, role, firstname, lastname, email, phone) VALUES
('superadmin', 'test123', 'SuperAdmin', 'Super', 'Admin', 'superadmin@example.com', NULL);

-- Insert Default Instructor Link (Correct Placement)
INSERT INTO instructors (user_id) VALUES (1);

-- Insert Default Courses (Now safe to link InstructorID 1)
-- Assuming FACA gets ID 1, BLS gets ID 3 after init (Check CourseTypes inserts)
INSERT INTO courses (course_number, organization_id, instructor_id, course_type_id, date_requested, date_scheduled, location, students_registered, status) VALUES
('20250501-SEN-FACA', 1, 1, 1, '2025-05-01', '2025-05-15', 'Seneca Campus Room A', 10, 'Scheduled'),
('20250510-DEF-BLS', 2, 1, 3, '2025-05-10', '2025-05-20', 'Default Client Boardroom', 8, 'Scheduled');

-- Insert Default Students for Default Courses
-- Assuming the courses above get IDs 1 and 2 respectively
INSERT INTO students (course_id, firstname, lastname, email, attendance) VALUES
(1, 'Alice', 'Alpha', 'alice@test.com', FALSE),
(1, 'Bob', 'Beta', 'bob@test.com', FALSE),
(1, 'Charlie', 'Gamma', 'charlie@test.com', FALSE),
(2, 'David', 'Delta', 'david@test.com', FALSE),
(2, 'Eve', 'Epsilon', 'eve@test.com', FALSE);

-- Create user_sessions table for session storage
CREATE TABLE IF NOT EXISTS user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

-- Create index on expire column for faster cleanup
CREATE INDEX IF NOT EXISTS idx_user_sessions_expire ON user_sessions(expire);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(userid),
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token)
); 