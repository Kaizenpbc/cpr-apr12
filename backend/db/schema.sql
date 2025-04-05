-- Create InstructorAvailability table
CREATE TABLE IF NOT EXISTS instructoravailability (
    id SERIAL PRIMARY KEY,
    instructorid INTEGER NOT NULL,
    availabledate DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(instructorid, availabledate)
);

-- Create ScheduledClasses table
CREATE TABLE IF NOT EXISTS scheduledclasses (
    id SERIAL PRIMARY KEY,
    instructorid INTEGER NOT NULL,
    organizationid INTEGER NOT NULL,
    classdate DATE NOT NULL,
    location VARCHAR(255) NOT NULL,
    classtype VARCHAR(50) NOT NULL,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints
ALTER TABLE instructoravailability
ADD CONSTRAINT fk_instructoravailability_instructor
FOREIGN KEY (instructorid) REFERENCES users(userid);

ALTER TABLE scheduledclasses
ADD CONSTRAINT fk_scheduledclasses_instructor
FOREIGN KEY (instructorid) REFERENCES users(userid),
ADD CONSTRAINT fk_scheduledclasses_organization
FOREIGN KEY (organizationid) REFERENCES organizations(organizationid); 