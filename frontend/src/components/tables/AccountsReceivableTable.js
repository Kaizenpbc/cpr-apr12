import React, { useState } from 'react';
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
    Chip, // For status visualization
    IconButton, // Added IconButton
    Collapse, // Added Collapse for expansion
    CircularProgress // Added CircularProgress
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'; // Expand icon
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'; // Collapse icon
import * as api from '../../services/api'; // Import API service

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString(); 
    } catch (e) {
        return 'Invalid Date';
    }
};

// Function to get color based on payment status
const getStatusChipColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'paid':
            return 'success';
        case 'pending':
            return 'warning';
        case 'overdue':
            return 'error';
        default:
            return 'default';
    }
};

// Component to display within the expanded row
const PaymentDetails = ({ invoiceId }) => {
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    React.useEffect(() => {
        const loadPayments = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await api.getInvoicePayments(invoiceId);
                setPayments(data || []);
            } catch (err) {
                setError(err.message || 'Could not load payment details.');
                setPayments([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadPayments();
    }, [invoiceId]);

    if (isLoading) return <CircularProgress size={20} sx={{ m: 1 }} />;
    if (error) return <Typography color="error" sx={{ m: 1 }}>{error}</Typography>;
    if (payments.length === 0) return <Typography sx={{ m: 1, fontStyle: 'italic' }}>No payments recorded for this invoice.</Typography>;

    // Simple table to display payments
    return (
        <Box sx={{ margin: 1 }}>
            <Typography variant="subtitle2" gutterBottom component="div">
                Payment History
            </Typography>
            <Table size="small" aria-label="payment history">
                <TableHead>
                    <TableRow>
                        <TableCell>Payment Date</TableCell>
                        <TableCell>Amount Paid</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell>Reference</TableCell>
                        <TableCell>Notes</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {payments.map((payment) => (
                        <TableRow key={payment.paymentid}>
                            <TableCell>{formatDate(payment.paymentdate)}</TableCell>
                            <TableCell>{`$${parseFloat(payment.amountpaid || 0).toFixed(2)}`}</TableCell>
                            <TableCell>{payment.paymentmethod || '-'}</TableCell>
                            <TableCell>{payment.referencenumber || '-'}</TableCell>
                            <TableCell>{payment.notes || '-'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
};

const AccountsReceivableTable = ({ 
    invoices, 
    onRecordPaymentClick, 
    onViewDetailsClick, 
    onEmailInvoiceClick 
}) => {
    const [expandedRowId, setExpandedRowId] = useState(null); // State to track expanded row

    const handleExpandClick = (invoiceId) => {
        setExpandedRowId(expandedRowId === invoiceId ? null : invoiceId); // Toggle expansion
    };

    if (!invoices || invoices.length === 0) {
        return <Typography sx={{ mt: 2 }}>No invoices found.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="accounts receivable table">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '10px' }} /> {/* Empty cell for expand button */}
                        <TableCell>Invoice #</TableCell>
                        <TableCell>Invoice Date</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Course #</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="center">Payment Status</TableCell>
                        <TableCell>Aging</TableCell>
                        <TableCell>Email Sent</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invoices.map((invoice) => (
                        <React.Fragment key={invoice.invoiceid}> {/* Use Fragment for expansion */}
                            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}> {/* Remove bottom border for expandable row */}
                                <TableCell>
                                    {/* Expand/Collapse Button */}
                                    <IconButton
                                        aria-label="expand row"
                                        size="small"
                                        onClick={() => handleExpandClick(invoice.invoiceid)}
                                    >
                                        {expandedRowId === invoice.invoiceid ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                    </IconButton>
                                </TableCell>
                                <TableCell>{invoice.invoicenumber}</TableCell> 
                                <TableCell>{formatDate(invoice.invoicedate)}</TableCell> 
                                <TableCell>{formatDate(invoice.duedate)}</TableCell> 
                                <TableCell>{invoice.organizationname || '-'}</TableCell>
                                <TableCell>{invoice.coursenumber || '-'}</TableCell>
                                <TableCell align="right">{`$${parseFloat(invoice.amount || 0).toFixed(2)}`}</TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        label={invoice.paymentstatus || 'Unknown'} 
                                        color={getStatusChipColor(invoice.paymentstatus)} 
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{invoice.agingBucket || '-'}</TableCell>
                                <TableCell>{invoice.emailsentat ? formatDate(invoice.emailsentat) : '-'}</TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                        <Tooltip title="Record Payment Received">
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                color="success"
                                                onClick={() => onRecordPaymentClick(invoice)}
                                                disabled={invoice.paymentstatus?.toLowerCase() === 'paid'}
                                            >
                                                Record Payment
                                            </Button>
                                        </Tooltip>
                                        <Tooltip title="View Course/Invoice Details">
                                            <Button 
                                                variant="outlined" 
                                                size="small"
                                                onClick={() => onViewDetailsClick(invoice.invoiceid)}
                                            >
                                                Details
                                            </Button>
                                        </Tooltip>
                                         <Tooltip title={invoice.emailsentat ? "Resend Invoice Email" : "Email Invoice to Organization"}>
                                            <Button 
                                                variant={invoice.emailsentat ? "text" : "outlined"} 
                                                size="small"
                                                color="primary"
                                                onClick={() => onEmailInvoiceClick(invoice.invoiceid)}
                                                disabled={!invoice.contactemail} // Should disable if no email to send to
                                            >
                                                {invoice.emailsentat ? 'Resend' : 'Email'}
                                            </Button>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                             {/* Expanded Row for Payment Details */}
                             <TableRow>
                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}> {/* Adjust colSpan based on total columns */}
                                    <Collapse in={expandedRowId === invoice.invoiceid} timeout="auto" unmountOnExit>
                                        {/* Render PaymentDetails component only when expanded */}
                                        {expandedRowId === invoice.invoiceid && (
                                            <PaymentDetails invoiceId={invoice.invoiceid} />
                                        )}
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AccountsReceivableTable; 