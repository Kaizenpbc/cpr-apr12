import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    TableSortLabel,
    Box
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

// Helper function to format date string
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (e) {
        return 'Invalid Date';
    }
};

const InstructorDashboardTable = ({ data, sortOrder, sortBy, onSortRequest }) => {

    if (!data || data.length === 0) {
        return <Typography sx={{ mt: 2 }}>No instructor availability or scheduled classes found.</Typography>;
    }

    const createSortHandler = (property) => (event) => {
        onSortRequest(property);
    };

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="instructor dashboard table">
                <TableHead>
                    <TableRow>
                        <TableCell
                            key="instructorName"
                            sortDirection={sortBy === 'instructorName' ? sortOrder : false}
                            sx={{ fontWeight: 'bold' }}
                        >
                            <TableSortLabel
                                active={sortBy === 'instructorName'}
                                direction={sortBy === 'instructorName' ? sortOrder : 'asc'}
                                onClick={createSortHandler('instructorName')}
                            >
                                Instructor Name
                                {sortBy === 'instructorName' ? (
                                    <Box component="span" sx={visuallyHidden}>
                                        {sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                    </Box>
                                ) : null}
                            </TableSortLabel>
                        </TableCell>
                        <TableCell
                            key="date"
                            sortDirection={sortBy === 'date' ? sortOrder : false}
                            sx={{ fontWeight: 'bold' }}
                        >
                            <TableSortLabel
                                active={sortBy === 'date'}
                                direction={sortBy === 'date' ? sortOrder : 'asc'}
                                onClick={createSortHandler('date')}
                            >
                                Date
                                {sortBy === 'date' ? (
                                    <Box component="span" sx={visuallyHidden}>
                                        {sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                    </Box>
                                ) : null}
                            </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course Number</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students Registered</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Students Attendance</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                        <TableCell
                            key="status"
                            sortDirection={sortBy === 'status' ? sortOrder : false}
                            sx={{ fontWeight: 'bold' }}
                        >
                            <TableSortLabel
                                active={sortBy === 'status'}
                                direction={sortBy === 'status' ? sortOrder : 'asc'}
                                onClick={createSortHandler('status')}
                            >
                                Status
                                {sortBy === 'status' ? (
                                    <Box component="span" sx={visuallyHidden}>
                                        {sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                    </Box>
                                ) : null}
                            </TableSortLabel>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((item) => {
                        // Extract course number if it's a course item
                        const courseNumber = item.id.startsWith('course-') ? item.coursenumber : '-';
                        return (
                            <TableRow 
                                key={item.id}
                                hover
                                sx={{ 
                                    '&:last-child td, &:last-child th': { border: 0 },
                                    bgcolor: item.status === 'Available' ? '#fffde7' : 'inherit' 
                                }}
                            >
                                <TableCell>{item.instructorName || '-'}</TableCell>
                                <TableCell>{formatDate(item.date)}</TableCell>
                                <TableCell>{courseNumber}</TableCell>
                                <TableCell>{item.organizationName || '-'}</TableCell>
                                <TableCell>{item.location || '-'}</TableCell>
                                <TableCell align="center">{item.studentsRegistered ?? '-'}</TableCell>
                                <TableCell align="center">{item.studentsAttendance ?? '-'}</TableCell>
                                <TableCell>{item.notes || '-'}</TableCell>
                                <TableCell>{item.status || '-'}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default InstructorDashboardTable; 