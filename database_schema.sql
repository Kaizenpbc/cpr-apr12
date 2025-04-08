-- Drop existing tables in reverse order of creation due to dependencies
DROP TABLE IF EXISTS Students CASCADE;
DROP TABLE IF EXISTS Invoices CASCADE;
DROP TABLE IF EXISTS InstructorAvailability CASCADE;
DROP TABLE IF EXISTS ScheduledClasses CASCADE;
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
ALTER TABLE Users 
ADD CONSTRAINT fk_organization 
FOREIGN KEY (OrganizationID) 
REFERENCES Organizations(OrganizationID);

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
    Description TEXT,
    Duration INT, -- Duration in hours
    MaxStudents INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID) ON DELETE CASCADE
);

-- Instructor Availability Table
CREATE TABLE InstructorAvailability (
    AvailabilityID SERIAL PRIMARY KEY,
    InstructorID INT NOT NULL,
    AvailableDate DATE NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (InstructorID) REFERENCES Users(UserID) ON DELETE CASCADE,
    UNIQUE (InstructorID, AvailableDate)
);

-- Scheduled Classes Table
CREATE TABLE ScheduledClasses (
    ClassID SERIAL PRIMARY KEY,
    InstructorID INT NOT NULL,
    OrganizationID INT NOT NULL,
    ClassDate DATE NOT NULL,
    Location VARCHAR(255) NOT NULL,
    ClassType VARCHAR(50) NOT NULL,
    RegisteredStudents INT DEFAULT 0,
    Attendance INT DEFAULT 0,
    Notes TEXT,
    Status VARCHAR(50) DEFAULT 'Available' CHECK (Status IN ('Available', 'Scheduled')),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (InstructorID) REFERENCES Users(UserID) ON DELETE CASCADE,
    FOREIGN KEY (OrganizationID) REFERENCES Organizations(OrganizationID) ON DELETE CASCADE
);

-- Insert default course types
INSERT INTO CourseTypes (CourseTypeName, Description, Duration, MaxStudents) VALUES
('Basic Life Support', 'Basic CPR and AED training for healthcare providers', 4, 12),
('HeartSaver CPR/AED', 'CPR and AED training for lay rescuers', 3, 15),
('Advanced Cardiac Life Support', 'Advanced cardiovascular life support for healthcare professionals', 8, 10),
('Pediatric Advanced Life Support', 'Specialized pediatric life support training', 8, 10);

-- Insert test users
INSERT INTO Users (Username, Password, Role, FirstName, LastName, Email, Phone) VALUES
('instructor', 'test123', 'Instructor', 'John', 'Doe', 'instructor@example.com', NULL),
('orgadmin', 'test123', 'Organization', 'Jane', 'Smith', 'orgadmin@example.com', NULL),
('courseadmin', 'test123', 'Admin', 'Michael', 'Johnson', 'michael.j@example.com', NULL),
('actadmin', 'test123', 'Accounting', 'Sarah', 'Wilson', 'actadmin@example.com', NULL);

-- Insert default SuperAdmin user
INSERT INTO Users (Username, Password, Role, FirstName, LastName, Email, Phone) VALUES
('superadmin', 'test123', 'SuperAdmin', 'Super', 'Admin', 'superadmin@example.com', NULL);

-- Define User-Organization Foreign Key after both tables exist
ALTER TABLE Users DROP CONSTRAINT IF EXISTS fk_organization;
ALTER TABLE Users 
ADD CONSTRAINT fk_organization 
FOREIGN KEY (OrganizationID) 
REFERENCES Organizations(OrganizationID); 