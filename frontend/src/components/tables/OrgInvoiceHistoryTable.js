import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    Typography,
    Tooltip,
    Chip,
    IconButton,
    Link as MuiLink // Use alias to avoid conflict
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // For linking later if needed
// Import necessary icons
import VisibilityIcon from '@mui/icons-material/Visibility';
import EmailIcon from '@mui/icons-material/Email';
// Import shared formatters
import { formatDate, formatCurrency, getStatusChipColor } from '../../utils/formatters'; // Correct path

const OrgInvoiceHistoryTable = ({ 
    invoices = [], // Default to empty array
    // Pass handlers for actions if needed from parent page
    // onViewDetailsClick, 
    // onEmailInvoiceClick 
}) => {

    if (!invoices || invoices.length === 0) {
        return <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No invoices found for this organization.</Typography>;
    }

    // TODO: Add state and handlers for sorting if required

    return (
        <TableContainer component={Paper} sx={{ mt: 1 }}> {/* Use Paper for consistency */}
            <Table stickyHeader size="small" aria-label="organization invoice history table">
                <TableHead>
                    <TableRow>
                        {/* Consider which columns are most relevant here */}
                        <TableCell sx={{ fontWeight: 'bold' }}>Invoice #</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Invoice Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Course #</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Aging</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Email Sent</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell> 
                    </TableRow>
                </TableHead>
                <TableBody>
                    {invoices.map((invoice, index) => (
                        // Using Fragment as expanding isn't directly implemented here yet
                        <React.Fragment key={invoice.invoiceid}>
                            <TableRow hover sx={{ backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit'}}>
                                <TableCell>{invoice.invoicenumber}</TableCell> 
                                <TableCell>{formatDate(invoice.invoicedate)}</TableCell> 
                                <TableCell>{formatDate(invoice.duedate)}</TableCell> 
                                <TableCell>{invoice.coursenumber || '-'}</TableCell>
                                <TableCell align="right">{formatCurrency(invoice.amount)}</TableCell>
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
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                        {/* TODO: Link these buttons to parent handlers if actions are needed */}
                                        <Tooltip title="View Details">
                                            <IconButton 
                                                color="info"
                                                size="small"
                                                // onClick={() => onViewDetailsClick(invoice.invoiceid)} // Example
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Email Invoice">
                                             <span> {/* Wrapper for disabled state */}
                                                <IconButton 
                                                    color="primary"
                                                    size="small"
                                                    disabled={!invoice.contactemail} // Use contactemail from fetched data if available
                                                    // onClick={() => onEmailInvoiceClick(invoice.invoiceid)} // Example
                                                >
                                                    <EmailIcon fontSize="small" />
                                                </IconButton>
                                             </span>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default OrgInvoiceHistoryTable; 