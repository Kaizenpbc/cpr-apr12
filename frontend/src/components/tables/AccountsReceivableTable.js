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
    Chip // For status visualization
} from '@mui/material';

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

const AccountsReceivableTable = ({ 
    invoices, 
    onRecordPaymentClick, 
    onViewDetailsClick, 
    onEmailInvoiceClick 
}) => {

    if (!invoices || invoices.length === 0) {
        return <Typography sx={{ mt: 2 }}>No invoices found.</Typography>;
    }

    return (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table stickyHeader aria-label="accounts receivable table">
                <TableHead>
                    <TableRow>
                        <TableCell>Invoice #</TableCell>
                        <TableCell>Invoice Date</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Organization</TableCell>
                        <TableCell>Course #</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="center">Payment Status</TableCell>
                        <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invoices.map((invoice) => (
                        <TableRow key={invoice.invoiceid} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
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
                            <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <Tooltip title="Record Payment Received">
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            color="success"
                                            onClick={() => onRecordPaymentClick(invoice.invoiceid)}
                                            disabled={invoice.paymentstatus?.toLowerCase() === 'paid'} // Disable if already paid
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
                                     <Tooltip title="Email Invoice to Organization">
                                        <Button 
                                            variant="outlined" 
                                            size="small"
                                            color="primary"
                                            onClick={() => onEmailInvoiceClick(invoice.invoiceid)}
                                            disabled={true} // Disabled for now
                                        >
                                            Email
                                        </Button>
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

export default AccountsReceivableTable; 