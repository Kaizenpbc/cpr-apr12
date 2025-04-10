-- Drop existing tables in reverse order of creation due to dependencies
DROP TABLE IF EXISTS Students CASCADE;
DROP TABLE IF EXISTS Invoices CASCADE;
DROP TABLE IF EXISTS InstructorAvailability CASCADE;
DROP TABLE IF EXISTS ScheduledClasses CASCADE;
DROP TABLE IF EXISTS OrganizationCoursePricing CASCADE;
DROP TABLE IF EXISTS Courses CASCADE;
DROP TABLE IF EXISTS CourseTypes CASCADE;
DROP TABLE IF EXISTS Instructors CASCADE;
DROP TABLE IF EXISTS Users CASCADE; -- Depends on Organizations
DROP TABLE IF EXISTS Organizations CASCADE;

-- Create Users table
CREATE TABLE Users (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(255) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Role VARCHAR(50) NOT NULL CHECK (Role IN ('Instructor', 'Organization', 'Admin', 'Accounting', 'SuperAdmin')),
    FirstName VARCHAR(255),
    LastName VARCHAR(255),
    Email VARCHAR(255) UNIQUE,
    Phone VARCHAR(20),
    OrganizationID INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- FOREIGN KEY (OrganizationID) REFERENCES Organizations(OrganizationID) -- Commented out: Defined later
);

-- Create Organizations table
CREATE TABLE Organizations (
    OrganizationID SERIAL PRIMARY KEY,
    OrganizationName VARCHAR(255) UNIQUE NOT NULL,
    ContactName VARCHAR(255),
    ContactEmail VARCHAR(255),
    ContactPhone VARCHAR(20),
    -- New Address Fields
    AddressStreet VARCHAR(255),
    AddressCity VARCHAR(100),
    AddressProvince VARCHAR(50), -- Or CHAR(2) depending on standard
    AddressPostalCode VARCHAR(10),
    -- MainPhone VARCHAR(20), -- Removed
    -- New CEO Fields
    CEOName VARCHAR(255),
    CEOPhone VARCHAR(20),
    CEOEmail VARCHAR(255),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key to Users table (Moved Here - After Organizations is created)
ALTER TABLE Users DROP CONSTRAINT IF EXISTS fk_organization;
ALTER TABLE Users 
ADD CONSTRAINT fk_organization 
FOREIGN KEY (OrganizationID) 
REFERENCES Organizations(OrganizationID);

-- Insert Default Organizations (Re-added)
INSERT INTO Organizations (OrganizationName, ContactName, ContactEmail, ContactPhone, AddressStreet, AddressCity, AddressProvince, AddressPostalCode, CEOName, CEOEmail, CEOPhone) VALUES
('Seneca College', 'Admin Contact', 'contact@seneca.ca', '416-491-5050', '1750 Finch Ave E', 'North York', 'ON', 'M2J 2X5', 'David Agnew', 'david.agnew@senecacollege.ca', '416-491-5050'),
('Default Client Inc.', 'Default Contact', 'contact@default.com', '905-555-1234', '1 Default St', 'Default City', 'ON', 'L1L 1L1', 'Mr. Default', 'ceo@default.com', '905-555-1111');

-- Create Instructors table
CREATE TABLE Instructors (
    InstructorID SERIAL PRIMARY KEY,
    UserID INT UNIQUE NOT NULL,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    Availability JSON,
    Certifications TEXT[],
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create CourseTypes table
CREATE TABLE CourseTypes (
    CourseTypeID SERIAL PRIMARY KEY,
    CourseTypeName VARCHAR(255) UNIQUE NOT NULL,
    CourseCode VARCHAR(10) UNIQUE NOT NULL,
    Description TEXT,
    Duration INT, -- Duration in hours
    MaxStudents INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create OrganizationCoursePricing table
CREATE TABLE OrganizationCoursePricing (
    PricingID SERIAL PRIMARY KEY,
    OrganizationID INT NOT NULL,
    CourseTypeID INT NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrganizationID) REFERENCES Organizations(OrganizationID) ON DELETE CASCADE, -- Cascade delete if org is deleted
    FOREIGN KEY (CourseTypeID) REFERENCES CourseTypes(CourseTypeID) ON DELETE CASCADE, -- Cascade delete if course type is deleted
    UNIQUE (OrganizationID, CourseTypeID) -- Prevent duplicate price for same org/course type combo
);

-- Create Courses table
CREATE TABLE Courses (
    CourseID SERIAL PRIMARY KEY,
    CourseNumber VARCHAR(50) UNIQUE NOT NULL,
    OrganizationID INT NOT NULL,
    InstructorID INT,
    CourseTypeID INT NOT NULL,
    DateRequested DATE NOT NULL,
    DateScheduled DATE,
    Location VARCHAR(255),
    StudentsRegistered INT DEFAULT 0,
    Notes TEXT,
    Status VARCHAR(50) NOT NULL DEFAULT 'Pending' 
        CHECK (Status IN ('Pending', 'Scheduled', 'Completed', 'Cancelled', 'Billing Ready', 'Invoiced')),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (OrganizationID) REFERENCES Organizations(OrganizationID),
    FOREIGN KEY (InstructorID) REFERENCES Instructors(InstructorID),
    FOREIGN KEY (CourseTypeID) REFERENCES CourseTypes(CourseTypeID)
);

-- Create Students table
CREATE TABLE Students (
    StudentID SERIAL PRIMARY KEY,
    CourseID INT NOT NULL,
    FirstName VARCHAR(255) NOT NULL,
    LastName VARCHAR(255) NOT NULL,
    Email VARCHAR(255),
    Attendance BOOLEAN DEFAULT FALSE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID) ON DELETE CASCADE
);

-- Create Invoices table
CREATE TABLE Invoices (
    InvoiceID SERIAL PRIMARY KEY,
    CourseID INT NOT NULL,
    InvoiceNumber VARCHAR(50) UNIQUE NOT NULL,
    InvoiceDate DATE NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL,
    PaymentStatus VARCHAR(50) NOT NULL DEFAULT 'Pending'
        CHECK (PaymentStatus IN ('Pending', 'Paid', 'Overdue')),
    DueDate DATE NOT NULL,
    EmailSentAt TIMESTAMP NULL, -- Added column to track email sending
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID) ON DELETE CASCADE
);

-- Create Payments table to track individual payments against invoices
CREATE TABLE Payments (
    PaymentID SERIAL PRIMARY KEY,
    InvoiceID INT NOT NULL,
    PaymentDate DATE NOT NULL,
    AmountPaid DECIMAL(10, 2) NOT NULL,
    PaymentMethod VARCHAR(50), -- e.g., 'Check', 'EFT', 'Credit Card'
    ReferenceNumber VARCHAR(100), -- e.g., Check number, transaction ID
    Notes TEXT,
    RecordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Optional: Could add RecordedByUserID referencing Users(UserID)
    FOREIGN KEY (InvoiceID) REFERENCES Invoices(InvoiceID) ON DELETE CASCADE
);

-- Create InstructorAvailability table (Restored)
CREATE TABLE InstructorAvailability (
    AvailabilityID SERIAL PRIMARY KEY,
    InstructorID INT NOT NULL, -- Should reference Users(UserID)
    AvailableDate DATE NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Re-add Foreign Key constraint (assuming Users table exists before this)
    FOREIGN KEY (InstructorID) REFERENCES Users(UserID) ON DELETE CASCADE, 
    UNIQUE (InstructorID, AvailableDate) -- Use standard UNIQUE constraint
);

-- Create ScheduledClasses table (Restored)
CREATE TABLE ScheduledClasses (
    ClassID SERIAL PRIMARY KEY,
    InstructorID INT NOT NULL,
    OrganizationID INT NOT NULL,
    ClassDate DATE NOT NULL,
    Location VARCHAR(255) NOT NULL,
    ClassType VARCHAR(50) NOT NULL, -- Refers to CourseType Name/Code conceptually?
    RegisteredStudents INT DEFAULT 0,
    Attendance INT DEFAULT 0, -- Consider linking to Students table instead?
    Notes TEXT,
    Status VARCHAR(50) DEFAULT 'Available' CHECK (Status IN ('Available', 'Scheduled')), -- Corrected syntax
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (InstructorID) REFERENCES Users(UserID) ON DELETE CASCADE, 
    FOREIGN KEY (OrganizationID) REFERENCES Organizations(OrganizationID) ON DELETE CASCADE
);

-- Insert default course types based *only* on user provided list
-- Remove any previously existing default CourseType inserts first
DELETE FROM CourseTypes; -- Simple clear, assumes init-db runs DROP TABLE first anyway
INSERT INTO CourseTypes (CourseTypeName, CourseCode, Description, Duration, MaxStudents) VALUES
('First Aid and CPR Level A', 'FACA', NULL, NULL, NULL),
('First Aid and CPR Level C', 'FACC', NULL, NULL, NULL),
('Basic Life Support (BLS)', 'BLS', NULL, NULL, NULL),
('WHMIS Training & Certification', 'WHMIS', NULL, NULL, NULL),
('Mask Fit Test & Certification', 'MASK', NULL, NULL, NULL);

-- Insert test users
INSERT INTO Users (Username, Password, Role, FirstName, LastName, Email, Phone, OrganizationID) VALUES
('instructor', 'test123', 'Instructor', 'John', 'Doe', 'instructor@example.com', NULL, NULL),
('orgadmin', 'test123', 'Organization', 'Jane', 'Smith', 'orgadmin@example.com', NULL, 1), -- Link orgadmin to Org ID 1
('courseadmin', 'test123', 'Admin', 'Michael', 'Johnson', 'michael.j@example.com', NULL, NULL),
('actadmin', 'test123', 'Accounting', 'Sarah', 'Wilson', 'actadmin@example.com', NULL, NULL);

-- Insert default SuperAdmin user
INSERT INTO Users (Username, Password, Role, FirstName, LastName, Email, Phone) VALUES
('superadmin', 'test123', 'SuperAdmin', 'Super', 'Admin', 'superadmin@example.com', NULL);

-- Insert Default Instructor Link (Correct Placement)
INSERT INTO Instructors (UserID) VALUES (1);

-- Insert Default Courses (Now safe to link InstructorID 1)
-- Assuming FACA gets ID 1, BLS gets ID 3 after init (Check CourseTypes inserts)
INSERT INTO Courses (CourseNumber, OrganizationID, InstructorID, CourseTypeID, DateRequested, DateScheduled, Location, StudentsRegistered, Status) VALUES
('20250501-SEN-FACA', 1, 1, 1, '2025-05-01', '2025-05-15', 'Seneca Campus Room A', 10, 'Scheduled'),
('20250510-DEF-BLS', 2, 1, 3, '2025-05-10', '2025-05-20', 'Default Client Boardroom', 8, 'Scheduled');

-- Insert Default Students for Default Courses
-- Assuming the courses above get IDs 1 and 2 respectively
INSERT INTO Students (CourseID, FirstName, LastName, Email, Attendance) VALUES
(1, 'Alice', 'Alpha', 'alice@test.com', FALSE),
(1, 'Bob', 'Beta', 'bob@test.com', FALSE),
(1, 'Charlie', 'Gamma', 'charlie@test.com', FALSE),
(2, 'David', 'Delta', 'david@test.com', FALSE),
(2, 'Eve', 'Epsilon', 'eve@test.com', FALSE);

-- Define User-Organization Foreign Key after both tables exist (Re-added)
ALTER TABLE Users DROP CONSTRAINT IF EXISTS fk_organization;
ALTER TABLE Users 
ADD CONSTRAINT fk_organization 
FOREIGN KEY (OrganizationID) 
REFERENCES Organizations(OrganizationID); 