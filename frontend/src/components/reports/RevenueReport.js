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
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import * as api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import {
    BarChart,
    Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

// Function to get month name from YYYY-MM
const getMonthName = (monthStr) => {
    if (!monthStr || monthStr.length !== 7) return monthStr;
    const date = new Date(`${monthStr}-01T12:00:00`); // Use midday to avoid TZ issues
    return date.toLocaleString('default', { month: 'short' });
};

// --- Custom Tooltip for Revenue Chart ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Access the full data point for the month
    return (
      <Paper sx={{ padding: '8px 12px', fontSize: '0.8rem', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
        <Typography variant="caption" display="block" sx={{ fontWeight: 'bold' }}>{data.month}</Typography>
        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>BBF: {formatCurrency(data.balanceBroughtForward)}</Typography>
        <Typography variant="caption" display="block">+ Invoiced: {formatCurrency(data.totalInvoiced)}</Typography>
        <Typography variant="caption" display="block">= Total Due: {formatCurrency(data.totalDue)}</Typography>
        <Typography variant="caption" display="block">- Paid (Month): {formatCurrency(data.totalPaidInMonth)}</Typography>
        <Typography variant="caption" display="block" sx={{ fontWeight: 'bold', mt: 0.5 }}>= Ending Balance: {formatCurrency(data.endingBalance)}</Typography>
      </Paper>
    );
  }
  return null;
};
// --- End Custom Tooltip ---

const RevenueReport = () => {
    const [reportData, setReportData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [viewMode, setViewMode] = useState('chart');

    // Fetch data when selectedYear changes
    useEffect(() => {
        const fetchReport = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await api.getRevenueReport(selectedYear);
                const formattedData = data.map(item => ({
                    ...item, 
                    shortMonth: getMonthName(item.month),
                    totalDue: item.balanceBroughtForward + item.totalInvoiced,
                    endingBalance: item.balanceBroughtForward + item.totalInvoiced - item.totalPaidInMonth
                }));
                setReportData(formattedData || []);
            } catch (err) {
                setError(err.message || 'Could not load Revenue report.');
                setReportData([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, [selectedYear]); 

    const handleYearChange = (event) => {
        const year = parseInt(event.target.value, 10);
        if (!isNaN(year)) {
            setSelectedYear(year);
        }
    };

    const handleViewModeChange = (event, newViewMode) => {
        if (newViewMode !== null) {
            setViewMode(newViewMode);
        }
    };

    // Generate year options (e.g., last 5 years + current)
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>Revenue Report</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel id="year-select-label">Year</InputLabel>
                    <Select
                        labelId="year-select-label"
                        value={selectedYear}
                        label="Year"
                        onChange={handleYearChange}
                    >
                        {yearOptions.map(year => (
                            <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={handleViewModeChange}
                    aria-label="revenue report view mode"
                    size="small"
                >
                    <ToggleButton value="chart" aria-label="chart view">Chart</ToggleButton>
                    <ToggleButton value="table" aria-label="table view">Table</ToggleButton>
                </ToggleButtonGroup>
            </Box>
            
            {isLoading ? (
                <CircularProgress sx={{ m: 2 }} />
            ) : reportData.length === 0 ? (
                <Typography sx={{ m: 2 }}>No revenue data found for {selectedYear}.</Typography>
            ) : (
                <Box mt={2}>
                    {viewMode === 'chart' && (
                        <>
                            <Typography variant="subtitle1" gutterBottom>Monthly Ending Balance</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart 
                                    data={reportData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="shortMonth" />
                                    <YAxis tickFormatter={(value) => `$${value}`}/>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey="endingBalance" fill="#90caf9" name="Ending Balance (BBF+Invoiced-Paid)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </>
                    )}

                    {viewMode === 'table' && (
                        <>
                            <Typography variant="subtitle1" gutterBottom>Monthly Totals (Table)</Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Month</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Brought Forward</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Invoiced</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Due</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Paid (in Month)</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ending Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {reportData.map((row) => {
                                            const totalDue = row.balanceBroughtForward + row.totalInvoiced;
                                            return (
                                                <TableRow key={row.month} hover>
                                                    <TableCell>{row.month}</TableCell>
                                                    <TableCell align="right">{formatCurrency(row.balanceBroughtForward)}</TableCell>
                                                    <TableCell align="right">{formatCurrency(row.totalInvoiced)}</TableCell>
                                                    <TableCell align="right">{formatCurrency(totalDue)}</TableCell>
                                                    <TableCell align="right">{formatCurrency(row.totalPaidInMonth)}</TableCell>
                                                    <TableCell align="right">{formatCurrency(row.endingBalance)}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        <TableRow sx={{ '& td, & th': { borderTop: '2px solid black', fontWeight: 'bold' } }}>
                                            <TableCell>Total ({selectedYear})</TableCell>
                                            <TableCell align="right"></TableCell>
                                            <TableCell align="right">{formatCurrency(reportData.reduce((sum, row) => sum + row.totalInvoiced, 0))}</TableCell>
                                            <TableCell align="right"></TableCell>
                                            <TableCell align="right">{formatCurrency(reportData.reduce((sum, row) => sum + row.totalPaidInMonth, 0))}</TableCell>
                                            <TableCell align="right"></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Box>
            )}
        </Paper>
    );
};

export default RevenueReport; 