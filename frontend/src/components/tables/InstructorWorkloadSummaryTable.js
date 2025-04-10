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

const InstructorWorkloadSummaryTable = ({ workloads = [] }) => {

    if (!workloads || workloads.length === 0) {
        return <Typography sx={{ mt: 1, mb: 1, fontStyle: 'italic' }}>No workload data available.</Typography>;
    }

    // Optional: Sort workloads, e.g., by name
    const sortedWorkloads = [...workloads].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <TableContainer component={Paper} sx={{ mt: 1, mb: 3 }}> {/* Add margin */} 
            <Typography variant="h6" sx={{ p: 2, pb: 1 }}>Instructor Workload (Current Month)</Typography>
            <Table stickyHeader size="small" aria-label="instructor workload summary table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Instructor</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Completed Classes</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Upcoming Scheduled</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total (Month)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedWorkloads.map((wl) => (
                        <TableRow key={wl.instructorId} hover>
                            <TableCell component="th" scope="row">
                                {wl.name}
                            </TableCell>
                            <TableCell align="center">{wl.completedThisMonth}</TableCell>
                            <TableCell align="center">{wl.scheduledUpcomingThisMonth}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>{wl.totalWorkloadThisMonth}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default InstructorWorkloadSummaryTable; 