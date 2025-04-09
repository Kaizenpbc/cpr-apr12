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

const ReadyForBillingTable = ({ courses, onCreateInvoiceClick, onReviewClick }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No courses currently ready for billing.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="ready for billing table">
                <TableHead>
                    <TableRow>
                        <TableCell>System Date</TableCell>
                        <TableCell>Date Completed</TableCell>
                        <TableCell>Course Number</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Course Type</TableCell>
                        <TableCell>Students Registered</TableCell>
                        <TableCell>Students Attendance</TableCell>
                        <TableCell>Rate</TableCell>
                        <TableCell>Total Cost</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {courses.map((course) => (
                        <TableRow key={course.courseid} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>{formatDate(course.systemdate)}</TableCell> 
                            <TableCell>{formatDate(course.datecompleted)}</TableCell> 
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.organizationname || '-'}</TableCell>
                            <TableCell>{course.location || '-'}</TableCell>
                            <TableCell>{course.coursetypename || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell align="center">{course.studentsattendance ?? '-'}</TableCell>
                            <TableCell align="right">
                                {course.rateperstudent != null ? `$${parseFloat(course.rateperstudent).toFixed(2)}` : 'N/A'}
                            </TableCell>
                            <TableCell align="center">{'-'} {/* Cost Placeholder */}</TableCell>
                            <TableCell>{course.status || '-'}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                     <Tooltip title="Review Course Details & Student List">
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            onClick={() => onReviewClick(course.courseid)}
                                        >
                                            Review
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="Create Invoice for this Course">
                                        <Button 
                                            variant="contained" 
                                            size="small"
                                            onClick={() => onCreateInvoiceClick(course)} // Pass full course
                                        >
                                            Create Invoice
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

export default ReadyForBillingTable; 