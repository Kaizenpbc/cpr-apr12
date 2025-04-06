import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography
} from '@mui/material';

// Helper function to format date string
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString(); 
    } catch (e) {
        return 'Invalid Date';
    }
};

const InstructorArchiveTable = ({ courses }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No completed courses found in archive.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="archived courses table">
                <TableHead>
                    <TableRow>
                        {/* Define Table Headers - similar to scheduled but maybe remove actions? */}
                        <TableCell>Date Completed</TableCell> 
                        <TableCell>Course Number</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Course Type</TableCell>
                        <TableCell>Registered</TableCell>
                        <TableCell>Attendance</TableCell> {/* Placeholder */}
                        <TableCell>Notes</TableCell>
                        <TableCell>Status</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {courses.map((course) => (
                        <TableRow key={course.courseid} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>{formatDate(course.datescheduled)}</TableCell> {/* Use DateScheduled as completion date? */}
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.organizationname || '-'}</TableCell>
                            <TableCell>{course.location || '-'}</TableCell>
                            <TableCell>{course.coursetypename || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell align="center">{'-'}</TableCell> {/* Placeholder */}
                            <TableCell>{course.notes || '-'}</TableCell>
                            <TableCell>{course.status || '-'}</TableCell> 
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default InstructorArchiveTable; 