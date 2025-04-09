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
    Typography,
    Tooltip,
    IconButton,
    Box
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString(); 
    } catch (e) {
        return 'Invalid Date';
    }
};

const ScheduledCoursesTable = ({ courses, onViewStudentsClick, onCancelClick }) => {

    console.log('[ScheduledCoursesTable Render] Received courses prop:', courses);

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No scheduled courses found.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="scheduled courses table">
                <TableHead>
                    <TableRow>
                        <TableCell>System Date</TableCell>
                        <TableCell>Date Scheduled</TableCell>
                        <TableCell>Course Number</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Students Registered</TableCell>
                        <TableCell>Students Attendance</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Instructor</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {courses.map((course) => {
                        console.log(`[ScheduledCoursesTable Map] Rendering row for Course ID: ${course.courseid}. Full course object:`, JSON.stringify(course));
                        return (
                            <TableRow key={course.courseid} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell>{formatDate(course.systemdate)}</TableCell>
                                <TableCell>{formatDate(course.datescheduled)}</TableCell>
                                <TableCell>{course.coursenumber || '-'}</TableCell>
                                <TableCell>{course.organizationname || '-'}</TableCell>
                                <TableCell>{course.location || '-'}</TableCell>
                                <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                                <TableCell align="center">{course.studentsattendance ?? '-'}</TableCell>
                                <TableCell>{course.notes || '-'}</TableCell>
                                <TableCell>{course.status || '-'}</TableCell>
                                <TableCell>{course.instructorname || '-'}</TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                        <Tooltip title="View Registered Students">
                                            <IconButton 
                                                color="primary"
                                                size="small"
                                                onClick={() => onViewStudentsClick(course.courseid)}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Cancel Scheduled Course">
                                            <IconButton 
                                                color="error" 
                                                size="small"
                                                onClick={() => onCancelClick(course.courseid, course.coursenumber)}
                                            >
                                                <CancelIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default ScheduledCoursesTable; 