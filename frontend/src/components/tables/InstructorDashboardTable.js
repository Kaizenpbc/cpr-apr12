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

const InstructorDashboardTable = ({ data }) => {

    if (!data || data.length === 0) {
        return <Typography sx={{ mt: 2 }}>No instructor availability or scheduled classes found.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="instructor dashboard table">
                <TableHead>
                    <TableRow>
                        <TableCell>Instructor Name</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Students Registered</TableCell>
                        <TableCell>Students Attendance</TableCell> {/* Still placeholder */}
                        <TableCell>Notes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((item) => (
                        <TableRow 
                            key={item.id} // Use the combined ID from backend
                            hover
                            sx={{ 
                                '&:last-child td, &:last-child th': { border: 0 },
                                // Optional: Highlight 'Available' status
                                bgcolor: item.status === 'Available' ? '#fffde7' : 'inherit' 
                            }}
                        >
                            <TableCell>{item.instructorName || '-'}</TableCell>
                            <TableCell>{formatDate(item.date)}</TableCell>
                            <TableCell>{item.status || '-'}</TableCell>
                            <TableCell>{item.organizationName || '-'}</TableCell>
                            <TableCell>{item.location || '-'}</TableCell>
                            <TableCell align="center">{item.studentsRegistered ?? '-'}</TableCell>
                            <TableCell align="center">{item.studentsAttendance ?? '-'}</TableCell>
                            <TableCell>{item.notes || '-'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default InstructorDashboardTable; 