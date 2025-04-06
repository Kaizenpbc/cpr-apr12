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

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString(); 
    } catch (e) {
        return 'Invalid Date';
    }
};

const CompletedCoursesTable = ({ courses, onViewStudentsClick, onBillClick }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No completed courses found.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="completed courses table">
                <TableHead>
                    <TableRow>
                        <TableCell>System Date</TableCell>
                        <TableCell>Date Completed</TableCell>
                        <TableCell>Course Number</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Registered</TableCell>
                        <TableCell>Attendance</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Instructor</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {courses.map((course) => (
                        <TableRow key={course.courseid} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>{formatDate(course.systemdate)}</TableCell>
                            <TableCell>{formatDate(course.datescheduled)}</TableCell>
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.organizationname || '-'}</TableCell>
                            <TableCell>{course.location || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell align="center">{'-'}</TableCell>
                            <TableCell>{course.notes || '-'}</TableCell>
                            <TableCell>{course.status || '-'}</TableCell>
                            <TableCell>{course.instructorname || '-'}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <Tooltip title="View Registered Students">
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            onClick={() => onViewStudentsClick(course.courseid)}
                                        >
                                            View Students
                                        </Button>
                                    </Tooltip>
                                     <Tooltip title="Generate Invoice">
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            color="secondary"
                                            onClick={() => onBillClick(course.courseid)}
                                            disabled={course.status !== 'Completed'} 
                                        >
                                            Bill
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

export default CompletedCoursesTable; 