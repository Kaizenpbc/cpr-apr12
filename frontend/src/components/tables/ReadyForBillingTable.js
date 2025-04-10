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
    Tooltip,
    IconButton
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

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
                        <TableCell sx={{ fontWeight: 'bold' }}>System Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date Completed</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Number</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students Registered</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students Attendance</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Rate</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total Cost</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
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
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                     <Tooltip title="Review Course/Students">
                                        <IconButton 
                                            color="info"
                                            size="small"
                                            onClick={() => onReviewClick(course.courseid)}
                                        >
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                     <Tooltip title="Create Invoice">
                                        <IconButton 
                                            color="success"
                                            size="small"
                                            onClick={() => onCreateInvoiceClick(course)}
                                        >
                                            <ReceiptLongIcon fontSize="small" />
                                        </IconButton>
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