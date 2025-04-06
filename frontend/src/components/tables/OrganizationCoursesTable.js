import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    Box,
    Typography,
    Tooltip // Import Tooltip for action buttons
} from '@mui/material';

// Helper function to format date string (optional, can format directly)
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (e) {
        return 'Invalid Date';
    }
};

const OrganizationCoursesTable = ({ courses }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No courses found for this organization.</Typography>;
    }

    const handleUploadStudents = (courseId) => {
        // TODO: Implement student upload logic/navigation
        console.log("Upload students for course:", courseId);
        alert('Student Upload functionality not yet implemented.');
    };

    const handleViewStudents = (courseId) => {
        // TODO: Implement view students logic/navigation
        console.log("View students for course:", courseId);
        alert('View Students functionality not yet implemented.');
    };

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="organization courses table">
                <TableHead>
                    <TableRow>
                        {/* Define Table Headers based on requirements */}
                        <TableCell>System Date</TableCell>
                        <TableCell>Date Requested</TableCell>
                        <TableCell>Course Number</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Course Type</TableCell>
                        <TableCell>Registered</TableCell>
                        <TableCell>Attendance</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Instructor</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {courses.map((course) => (
                        <TableRow 
                            key={course.courseid} 
                            hover
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell>{formatDate(course.createdat)}</TableCell> {/* Assuming createdat is System Date */}
                            <TableCell>{formatDate(course.daterequested)}</TableCell>
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.location || '-'}</TableCell>
                            <TableCell>{course.coursetypename || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell> {/* Use correct column name */}
                            <TableCell align="center">{'-'}</TableCell> {/* Placeholder for Attendance */}
                            <TableCell>{course.status || '-'}</TableCell>
                            <TableCell>{course.instructorname || (course.status === 'Pending' ? 'Not Assigned' : '-')}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <Tooltip title="Upload Student List">
                                        {/* Disable button based on status if needed */}
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            onClick={() => handleUploadStudents(course.courseid)}
                                            // disabled={course.status !== 'Pending' && course.status !== 'Scheduled'} // Example condition
                                        >
                                            Upload
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="View Registered Students">
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            onClick={() => handleViewStudents(course.courseid)}
                                            // disabled={!course.studentsregistered > 0} // Example condition
                                        >
                                            View
                                        </Button>
                                    </Tooltip>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default OrganizationCoursesTable; 