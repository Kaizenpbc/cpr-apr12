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
                        {/* Apply bold styling to headers */}
                        <TableCell sx={{ fontWeight: 'bold' }}>Date Completed</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course No</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students Registered</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students Attendance</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        {/* Add other headers as needed, ensure they match render logic */}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {courses.map((course) => (
                        <TableRow key={course.courseid} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>{formatDate(course.datescheduled)}</TableCell> {/* Use DateScheduled as completion date? */}
                            <TableCell>{course.organizationname || '-'}</TableCell>
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.coursetypename || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell align="center">{course.studentsattendance ?? '-'}</TableCell>
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