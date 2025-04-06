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
    Tooltip
} from '@mui/material';

// Helper function to format date string
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        // Format date only, not time
        return new Date(dateString).toLocaleDateString(); 
    } catch (e) {
        return 'Invalid Date';
    }
};

const PendingCoursesTable = ({ courses, onScheduleClick, onViewStudentsClick }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No pending courses found.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="pending courses table">
                <TableHead>
                    <TableRow>
                        <TableCell>System Date</TableCell>
                        <TableCell>Date Requested</TableCell>
                        <TableCell>Course Number</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Registered</TableCell>
                        <TableCell>Attendance</TableCell> {/* Placeholder */}
                        <TableCell>Notes</TableCell>
                        <TableCell>Status</TableCell>
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
                            <TableCell>{formatDate(course.systemdate)}</TableCell> 
                            <TableCell>{formatDate(course.daterequested)}</TableCell>
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.organizationname || '-'}</TableCell>
                            <TableCell>{course.location || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell align="center">{'-'}</TableCell> {/* Placeholder for Attendance */}
                            <TableCell>{course.notes || '-'}</TableCell>
                            <TableCell>{course.status || '-'}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <Tooltip title="Schedule Instructor & Assign Date">
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            onClick={() => onScheduleClick(course)} // Pass full course object
                                        >
                                            Schedule
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="View Registered Students">
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            onClick={() => onViewStudentsClick(course.courseid)}
                                        >
                                            View Students
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

export default PendingCoursesTable; 