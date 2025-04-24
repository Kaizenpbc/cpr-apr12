import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Box, Typography, 
    Tooltip, IconButton
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

const MyClassesView = ({ combinedItems, onAttendanceClick }) => {
    return (
        <TableContainer component={Paper}>
            <Typography variant="h6" sx={{ p: 2 }}>My Schedule</Typography>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Organization</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Course No</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Course Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }} align="center">Students R</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }} align="center">Students A</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Notes</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {combinedItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} align="center">
                                No schedule items found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        combinedItems.map((item, index) => {
                            const isAvailable = item.type === 'availability';
                            const rowColor = index % 2 === 0 ? '#ffffff' : '#f5f5f5';
                            
                            return (
                                <TableRow 
                                    key={item.key || index}
                                    sx={{ 
                                        '& td': {
                                            backgroundColor: isAvailable ? '#fff59d !important' : rowColor
                                        },
                                        '&:hover td': {
                                            backgroundColor: '#e3f2fd !important'
                                        }
                                    }}
                                >
                                    <TableCell>{item.displayDate}</TableCell>
                                    <TableCell>{item.organizationname || '-'}</TableCell>
                                    <TableCell>{item.location || '-'}</TableCell>
                                    <TableCell>{item.coursenumber || '-'}</TableCell>
                                    <TableCell>{item.coursetypename || '-'}</TableCell>
                                    <TableCell align="center">{item.studentsregistered ?? '-'}</TableCell>
                                    <TableCell align="center">{item.studentsattendance ?? '-'}</TableCell>
                                    <TableCell>{item.notes || '-'}</TableCell>
                                    <TableCell sx={{ 
                                        fontWeight: 'medium', 
                                        color: isAvailable ? 'success.main' : 'primary.main'
                                    }}>
                                        {item.status}
                                    </TableCell>
                                    <TableCell>
                                        {!isAvailable && (
                                            <Tooltip title="View/Manage Attendance">
                                                <IconButton 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => onAttendanceClick(item)}
                                                >
                                                    <VisibilityIcon fontSize="small"/>
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MyClassesView; 