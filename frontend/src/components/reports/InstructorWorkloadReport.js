import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Grid,
    TextField,
    Button
} from '@mui/material';
import * as api from '../../services/api';
import { formatDate } from '../../utils/formatters';

// Helper to get default date range (e.g., current month)
const getDefaultDateRange = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const start = new Date(year, month, 1).toISOString().split('T')[0];
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
};

const InstructorWorkloadReport = () => {
    const [reportData, setReportData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState(getDefaultDateRange());

    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await api.getInstructorWorkloadReport(dateRange.startDate, dateRange.endDate);
            setReportData(data || []);
        } catch (err) {
            setError(err.message || 'Could not load Instructor Workload report.');
            setReportData([]);
        } finally {
            setIsLoading(false);
        }
    }, [dateRange]); // Re-fetch when date range changes

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleDateChange = (event) => {
        setDateRange(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const handleRunReport = () => {
        fetchReport(); // Manually trigger fetch if needed, though useEffect handles it
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>Instructor Workload Report</Typography>
            
            {/* Filter Section */}
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                    <TextField 
                        fullWidth 
                        label="Start Date" 
                        type="date" 
                        size="small" 
                        name="startDate"
                        value={dateRange.startDate}
                        onChange={handleDateChange}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                 <Grid item xs={12} sm={4}>
                     <TextField 
                        fullWidth 
                        label="End Date" 
                        type="date" 
                        size="small" 
                        name="endDate"
                        value={dateRange.endDate}
                        onChange={handleDateChange}
                        InputLabelProps={{ shrink: true }}
                    />
                 </Grid>
                 {/* <Grid item xs={12} sm={4}> // Optional Run button
                     <Button variant="contained" onClick={handleRunReport} disabled={isLoading}>
                         Run Report
                     </Button>
                 </Grid> */} 
            </Grid>

            {isLoading ? (
                <CircularProgress sx={{ m: 2 }} />
            ) : error ? (
                <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Instructor</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Completed Courses</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Scheduled Courses</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Courses</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {reportData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">No workload data found for the selected period.</TableCell>
                                </TableRow>
                            ) : (
                                reportData.map((row) => (
                                    <TableRow key={row.instructorId} hover>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell align="center">{row.completedCount}</TableCell>
                                        <TableCell align="center">{row.scheduledCount}</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>{row.completedCount + row.scheduledCount}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
             )}
        </Paper>
    );
};

export default InstructorWorkloadReport; 