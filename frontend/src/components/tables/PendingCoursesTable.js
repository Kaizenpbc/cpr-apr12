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
import EventIcon from '@mui/icons-material/Event';
import CancelIcon from '@mui/icons-material/Cancel';

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

const PendingCoursesTable = ({ courses, onScheduleClick, onViewStudentsClick, onCancelClick }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No pending courses found.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="pending courses table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>System Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date Requested</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Number</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students Registered</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
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
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell>{course.notes || '-'}</TableCell>
                            <TableCell>{course.status || '-'}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                    <Tooltip title="Schedule Instructor & Assign Date">
                                        <IconButton 
                                            color="primary" 
                                            size="small"
                                            onClick={() => onScheduleClick(course)} // Pass full course object
                                        >
                                            <EventIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="View Registered Students">
                                        <IconButton 
                                            color="info"
                                            size="small"
                                            onClick={() => onViewStudentsClick(course.courseid)}
                                        >
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Cancel Course Request">
                                        <IconButton 
                                            color="error" 
                                            size="small"
                                            onClick={() => onCancelClick(course.courseid, course.coursenumber)} // Pass ID and number
                                        >
                                            <CancelIcon fontSize="small" />
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

export default PendingCoursesTable; 