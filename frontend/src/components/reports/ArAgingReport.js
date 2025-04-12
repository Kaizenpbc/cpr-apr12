import React, { useState, useEffect } from 'react';
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
    Link as MuiLink
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import * as api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

// --- Helper to render the detail table for a bucket ---
const BucketDetailTable = ({ invoices, bucketTitle }) => {
    if (!invoices || invoices.length === 0) {
        return <Typography sx={{ p: 2, fontStyle: 'italic' }}>No invoices in this bucket.</Typography>;
    }

    return (
        <Box sx={{ mt: 1, mb: 2, pl: 2 }}> {/* Indent detail table slightly */}
            <Typography variant="subtitle2" gutterBottom>{bucketTitle} - Details:</Typography>
            <TableContainer component={Paper} elevation={1} variant="outlined">
                <Table size="small" aria-label={`${bucketTitle} details`}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{fontWeight: 'bold'}}>Invoice #</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Org Name</TableCell>
                            <TableCell sx={{fontWeight: 'bold'}}>Due Date</TableCell>
                            <TableCell align="right" sx={{fontWeight: 'bold'}}>Balance Due</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {invoices.map((inv) => (
                            <TableRow key={inv.invoiceId} hover>
                                <TableCell>{inv.invoiceNumber}</TableCell>
                                <TableCell>{inv.organizationName}</TableCell>
                                <TableCell>{formatDate(inv.dueDate)}</TableCell>
                                <TableCell align="right">{formatCurrency(inv.balanceDue)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
// --- End Helper ---

const ArAgingReport = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedBucketKey, setExpandedBucketKey] = useState(null); // State for expansion

    useEffect(() => {
        const fetchReport = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await api.getArAgingReport();
                setReportData(data);
            } catch (err) {
                setError(err.message || 'Could not load AR Aging report.');
                setReportData(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, []);

    if (isLoading) return <CircularProgress sx={{ m: 2 }} />;
    if (error) return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    if (!reportData || !reportData.buckets) return <Typography sx={{m: 2}}>No aging data available.</Typography>;

    const { buckets, grandTotal, reportDate } = reportData;

    // Define buckets with keys for expansion control
    const bucketMap = {
        current: { label: 'Current', data: buckets.current },
        days1_30: { label: '1-30 Days Past Due', data: buckets.days1_30 },
        days31_60: { label: '31-60 Days Past Due', data: buckets.days31_60 },
        days61_90: { label: '61-90 Days Past Due', data: buckets.days61_90 },
        over90: { label: 'Over 90 Days Past Due', data: buckets.over90 },
    };

    const handleBucketClick = (key) => {
        setExpandedBucketKey(expandedBucketKey === key ? null : key); // Toggle expansion
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>AR Aging Summary</Typography>
            <Typography variant="caption" display="block" gutterBottom>As of: {formatDate(reportDate)}</Typography>
            
            <TableContainer sx={{ mb: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Aging Bucket</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Outstanding</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {Object.entries(bucketMap).map(([key, bucketInfo]) => (
                            <React.Fragment key={key}>
                                <TableRow 
                                    hover 
                                    onClick={() => bucketInfo.data.invoices.length > 0 && handleBucketClick(key)} // Clickable if invoices exist
                                    sx={{ cursor: bucketInfo.data.invoices.length > 0 ? 'pointer' : 'default' }}
                                >
                                    <TableCell>{bucketInfo.label}</TableCell>
                                    <TableCell align="right">{formatCurrency(bucketInfo.data.total)}</TableCell>
                                </TableRow>
                                {/* Conditionally render Detail Table */} 
                                {expandedBucketKey === key && (
                                    <TableRow>
                                        {/* Cell spanning full width */} 
                                        <TableCell colSpan={2} sx={{ p: 0, border: 0 }}>
                                            <BucketDetailTable invoices={bucketInfo.data.invoices} bucketTitle={bucketInfo.label} />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                        {/* Grand Total Row */}
                         <TableRow sx={{ '& td, & th': { borderTop: '2px solid black', fontWeight: 'bold' } }}>
                            <TableCell>Grand Total Outstanding</TableCell>
                            <TableCell align="right">{formatCurrency(grandTotal)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default ArAgingReport; 