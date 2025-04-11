import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Typography,
    Tooltip,
    IconButton
} from '@mui/material';
// Import necessary icons if actions are added later
// import VisibilityIcon from '@mui/icons-material/Visibility';

// Reusable helper functions (Consider moving to utils)
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (e) {
        return 'Invalid Date';
    }
};
const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed':
        case 'paid':
        case 'invoiced':
            return 'success';
        case 'scheduled':
        case 'billing ready':
            return 'primary';
        case 'pending':
            return 'warning';
        case 'cancelled':
            return 'error';
        default:
            return 'default';
    }
};

const OrgCourseHistoryTable = ({ courses = [] }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No course history found for this organization.</Typography>;
    }

    // TODO: Add sorting/filtering state and handlers if needed
    const sortedCourses = [...courses].sort((a, b) => new Date(b.daterequested) - new Date(a.daterequested)); // Default sort by most recent request

    return (
        <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table stickyHeader size="small" aria-label="organization course history table">
                <TableHead>
                    <TableRow>
                        {/* Adjust columns as needed for this view */}
                        <TableCell sx={{ fontWeight: 'bold' }}>Date Requested</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date Scheduled</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course #</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Instructor</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Registered</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Attended</TableCell>
                        {/* Add Actions column if needed */}
                        {/* <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell> */}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedCourses.map((course, index) => (
                        <TableRow key={course.courseid} hover sx={{ backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit'}}>
                            <TableCell>{formatDate(course.daterequested)}</TableCell> 
                            <TableCell>{formatDate(course.datescheduled)}</TableCell> 
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.coursetypename || '-'}</TableCell>
                            <TableCell>{course.location || '-'}</TableCell>
                            <TableCell align="center">
                                <Chip 
                                    label={course.status || 'Unknown'} 
                                    color={getStatusChipColor(course.status)} 
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>{course.instructorname || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell align="center">{course.studentsattendance ?? '-'}</TableCell>
                            {/* Render action icons if implemented */}
                            {/* 
                            <TableCell align="center">
                                <Tooltip title="View Details">
                                    <IconButton size="small" color="info">
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell> 
                            */}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default OrgCourseHistoryTable; 