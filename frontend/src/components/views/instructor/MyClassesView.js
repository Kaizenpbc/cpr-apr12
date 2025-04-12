import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Box, Typography, Tooltip, IconButton
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility'; // If view action exists

// Receives the combinedItems array and handlers as props
const MyClassesView = ({ combinedItems, onAttendanceClick }) => {

    return (
        <TableContainer component={Paper}>
            <Typography variant="h6" sx={{ p: 2 }}>My Schedule & Availability</Typography>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                         <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Course No</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Students R</TableCell> 
                         <TableCell sx={{ fontWeight: 'bold' }}>Students A</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Status/Type</TableCell>
                         <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {combinedItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={10} align="center">No scheduled classes or availability found.</TableCell>
                        </TableRow>
                    ) : (
                        combinedItems.map((item, index) => (
                            <TableRow 
                                key={item.key}
                                sx={{ 
                                    backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 
                                                     item.type === 'class' ? '#e3f2fd' 
                                                     : item.type === 'availability' ? '#fffde7' 
                                                     : 'inherit',
                                    '&:hover': {
                                        backgroundColor: index % 2 !== 0 ? '#f0f0f0' : 
                                                        item.type === 'class' ? '#bbdefb' 
                                                         : item.type === 'availability' ? '#fff9c4' 
                                                         : 'action.hover'
                                    }
                                }}
                            >
                                <TableCell>{item.displayDate}</TableCell>
                                {item.type === 'class' ? (
                                    <>
                                        <TableCell>{item.organizationname || '-'}</TableCell>
                                        <TableCell>{item.location || '-'}</TableCell>
                                        <TableCell>{item.coursenumber || '-'}</TableCell>
                                        <TableCell>{item.coursetypename || '-'}</TableCell>
                                        <TableCell align="center">{item.studentsregistered ?? '-'}</TableCell>
                                        <TableCell align="center">{item.studentsattendance ?? '-'}</TableCell>
                                        <TableCell>{item.notes || '-'}</TableCell>
                                        <TableCell sx={{ fontStyle: 'italic' }}>Scheduled</TableCell>
                                        <TableCell>
                                            <Tooltip title="View/Manage Attendance">
                                                 <IconButton 
                                                    size="small" 
                                                    color="primary"
                                                    onClick={() => onAttendanceClick(item)} // Pass item to handler
                                                >
                                                     <VisibilityIcon fontSize="small"/>
                                                 </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </>
                                ) : ( // Availability Row
                                    <>
                                        <TableCell colSpan={8} sx={{ fontStyle: 'italic', color: 'text.secondary' }}>Availability Slot</TableCell>
                                        <TableCell>Available</TableCell>
                                        <TableCell></TableCell> {/* Empty Actions */}
                                    </>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MyClassesView; 