import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Grid,
    Divider
} from '@mui/material';
import * as api from '../../services/api'; // Adjust path as needed
import EmailIcon from '@mui/icons-material/Email';

// Helper function to format currency
const formatCurrency = (amount) => {
    if (amount == null) return 'N/A';
    return `$${parseFloat(amount).toFixed(2)}`;
};

// Helper function to format dates
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
};

const InvoiceDetailDialog = ({ open, onClose, invoiceId, onActionSuccess, onActionError }) => {
    const [invoice, setInvoice] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    useEffect(() => {
        if (open && invoiceId) {
            const fetchInvoiceDetails = async () => {
                setIsLoading(true);
                setError('');
                setInvoice(null);
                console.log(`[InvoiceDetailDialog] Fetching details for Invoice ID: ${invoiceId}`);
                try {
                    // *** TODO: Need to add getInvoiceDetails(invoiceId) function to services/api.js ***
                    const response = await api.getInvoiceDetails(invoiceId);
                    if (response.success) {
                        setInvoice(response.invoice);
                        console.log('[InvoiceDetailDialog] Invoice details loaded:', response.invoice);
                    } else {
                        throw new Error(response.message || 'Failed to load invoice details');
                    }
                } catch (err) {
                    console.error('Error loading invoice details:', err);
                    setError(err.message || 'Could not load invoice details.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchInvoiceDetails();
        }
    }, [open, invoiceId]);

    const handleSendEmail = async () => {
        if (!invoiceId) return;
        setIsSendingEmail(true);
        console.log(`[InvoiceDetailDialog] Attempting to send email for Invoice ID: ${invoiceId}`);
        try {
            const response = await api.emailInvoice(invoiceId);
            if (response.success) {
                let message = response.message || 'Email queued successfully.';
                if (response.previewUrl) {
                    console.log('Ethereal Preview URL:', response.previewUrl);
                    // Optionally include URL hint in message?
                    // message += ' Preview link logged to console.'; 
                }
                // Use callback prop to show snackbar in parent
                if (onActionSuccess) onActionSuccess(message);
                 // Optionally update email sent status locally if needed
                // setInvoice(prev => ({...prev, emailsentat: new Date().toISOString() })); 
                // onClose(); // Optionally close dialog after sending
            } else {
                throw new Error(response.message || 'Failed to send email via API.');
            }
        } catch (err) {
            console.error(`Error sending email for invoice ${invoiceId}:`, err);
             // Use callback prop to show error snackbar in parent
             if (onActionError) onActionError(err.message || 'Failed to send email.');
        } finally {
            setIsSendingEmail(false);
        }
    };

    // <<< ADD LOGGING HERE >>>
    console.log('[InvoiceDetailDialog Render] State before rendering Actions:', { isLoading, invoiceExists: !!invoice, contactEmailExists: !!invoice?.contactemail });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Invoice Details {invoice ? `(#${invoice.invoicenumber})` : ''}</DialogTitle>
            <DialogContent dividers>
                {isLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                )}
                {error && <Alert severity="error">{error}</Alert>}
                {invoice && !isLoading && (
                    <Box sx={{ p: 1 }}>
                        {/* Container for Header Info */}
                        <Grid container spacing={2}>
                            {/* Header Info - Remove 'item' prop */}
                            <Grid xs={6} md={3}><Typography variant="body2"><strong>Invoice #:</strong> {invoice.invoicenumber}</Typography></Grid>
                            <Grid xs={6} md={3}><Typography variant="body2"><strong>Invoice Date:</strong> {formatDate(invoice.invoicedate)}</Typography></Grid>
                            <Grid xs={6} md={3}><Typography variant="body2"><strong>Due Date:</strong> {formatDate(invoice.duedate)}</Typography></Grid>
                            <Grid xs={6} md={3}><Typography variant="body2"><strong>Status:</strong> {invoice.paymentstatus}</Typography></Grid>
                        </Grid>
                        <Divider sx={{ my: 2 }} />
                        {/* Organization Info */}
                        <Typography variant="subtitle1" gutterBottom>Bill To:</Typography>
                        <Typography variant="body1">{invoice.organizationname}</Typography>
                        {invoice.addressstreet && <Typography variant="body2">{invoice.addressstreet}</Typography>}
                        {invoice.addresscity && <Typography variant="body2">{`${invoice.addresscity}, ${invoice.addressprovince || ''} ${invoice.addresspostalcode || ''}`}</Typography>}
                        {invoice.contactname && <Typography variant="body2">Attn: {invoice.contactname}</Typography>}
                        {invoice.contactemail && <Typography variant="body2">Email: {invoice.contactemail}</Typography>}
                        <Divider sx={{ my: 2 }} />
                        {/* Course & Billing Details */}
                        <Typography variant="subtitle1" gutterBottom>Service Details:</Typography>
                         {/* Container for Service Details */}
                        <Grid container spacing={1}>
                            {/* Service Details - Remove 'item' prop */}
                            <Grid xs={12} sm={6}><Typography variant="body2"><strong>Course:</strong> {invoice.coursetypename} ({invoice.coursenumber})</Typography></Grid>
                            <Grid xs={12} sm={6}><Typography variant="body2"><strong>Date Completed:</strong> {formatDate(invoice.datecompleted)}</Typography></Grid>
                            <Grid xs={12} sm={6}><Typography variant="body2"><strong>Location:</strong> {invoice.location}</Typography></Grid>
                            <Grid xs={12} sm={6}><Typography variant="body2"><strong>Students Attended:</strong> {invoice.studentsattendance}</Typography></Grid>
                            <Grid xs={12} sm={6}><Typography variant="body2"><strong>Rate per Student:</strong> {formatCurrency(invoice.rateperstudent)}</Typography></Grid>
                            <Grid xs={12} sm={6}><Typography variant="body2" sx={{fontWeight: 'bold'}}><strong>Total Amount:</strong> {formatCurrency(invoice.amount)}</Typography></Grid>
                        </Grid>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                {/* Add Email button if email available */}
                {invoice?.contactemail && (
                     <Button 
                        onClick={handleSendEmail} 
                        color="primary" 
                        variant="contained" 
                        disabled={isLoading || isSendingEmail || !invoice || !invoice.contactemail}
                        startIcon={isSendingEmail ? <CircularProgress size={20} color="inherit"/> : <EmailIcon />}
                    >
                        {isSendingEmail ? 'Sending...' : (invoice?.emailsentat ? 'Resend Email' : 'Send Email')}
                    </Button>
                )}
                <Button onClick={onClose}>Close</Button>
                 {/* Placeholder for other actions like Record Payment */}
            </DialogActions>
        </Dialog>
    );
};

export default InvoiceDetailDialog; 