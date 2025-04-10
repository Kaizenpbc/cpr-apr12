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
    TableSortLabel,
    Chip,
    IconButton
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Helper function to format date string (optional, can format directly)
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (e) {
        return 'Invalid Date';
    }
};

const OrganizationCoursesTable = ({ courses, onUploadStudentsClick, onViewStudentsClick, sortOrder, sortBy, onSortRequest }) => {

    if (!courses || courses.length === 0) {
        return <Typography sx={{ mt: 2 }}>No courses found for this organization.</Typography>;
    }

    const handleViewStudents = (courseId) => {
        // TODO: Implement view students logic/navigation
        console.log("View students for course:", courseId);
        alert('View Students functionality not yet implemented.');
    };

    const createSortHandler = (property) => (event) => {
        onSortRequest(property);
    };

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="organization courses table">
                <TableHead>
                    <TableRow>
                        {/* Define Table Headers based on requirements */}
                        <TableCell>System Date</TableCell>
                        <TableCell 
                            key="daterequested"
                            sortDirection={sortBy === 'daterequested' ? sortOrder : false}
                        >
                            <TableSortLabel
                                active={sortBy === 'daterequested'}
                                direction={sortBy === 'daterequested' ? sortOrder : 'asc'}
                                onClick={createSortHandler('daterequested')}
                            >
                                Date Requested
                                {sortBy === 'daterequested' ? (
                                    <Box component="span" sx={visuallyHidden}>
                                        {sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                    </Box>
                                ) : null}
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>Course Number</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                        <TableCell>Students Registered</TableCell>
                        <TableCell>Students Attendance</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
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
                            <TableCell>{formatDate(course.systemdate)}</TableCell>
                            <TableCell>{formatDate(course.daterequested)}</TableCell>
                            <TableCell>{course.coursenumber || '-'}</TableCell>
                            <TableCell>{course.organizationname || '-'}</TableCell>
                            <TableCell>{course.location || '-'}</TableCell>
                            <TableCell>{course.coursetypename || '-'}</TableCell>
                            <TableCell align="center">{course.studentsregistered ?? '-'}</TableCell>
                            <TableCell align="center">{course.studentsattendance ?? '-'}</TableCell>
                            <TableCell>{course.notes || '-'}</TableCell>
                            <TableCell>
                                <Chip 
                                    label={course.status || 'Unknown'} 
                                    color={course.status === 'Pending' ? 'warning' : course.status === 'Completed' ? 'success' : 'default'}
                                />
                            </TableCell>
                            <TableCell>{course.instructorname || (course.status === 'Pending' ? 'Not Assigned' : '-')}</TableCell>
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                    <Tooltip title="Upload Student List">
                                        <IconButton 
                                            color="primary"
                                            size="small"
                                            onClick={() => onUploadStudentsClick(course.courseid)}
                                        >
                                            <UploadFileIcon fontSize="small"/>
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="View Registered Students">
                                        <IconButton 
                                            color="info"
                                            size="small"
                                            onClick={() => {
                                                console.log(`[OrgCoursesTable] View Students button clicked for courseId: ${course.courseid}`);
                                                onViewStudentsClick(course.courseid);
                                            }}
                                        >
                                            <VisibilityIcon fontSize="small"/>
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

export default OrganizationCoursesTable; 