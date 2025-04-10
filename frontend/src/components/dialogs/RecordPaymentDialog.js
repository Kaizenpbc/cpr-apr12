import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    CircularProgress,
    Alert,
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem,
    Box,
    Divider
} from '@mui/material';
import Typography from '@mui/material/Typography';
import * as api from '../../services/api'; // Adjust path as needed

// Helper function to format currency
const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '$0.00'; // Default to 0 if null/NaN
    return `$${parseFloat(amount).toFixed(2)}`;
};

const RecordPaymentDialog = ({ open, onClose, invoiceId, invoiceNumber, invoiceAmount, onPaymentRecorded }) => {
    const [paymentData, setPaymentData] = useState({
        paymentDate: new Date().toISOString().split('T')[0], // Default to today
        amountPaid: '',
        paymentMethod: '', // e.g., Check, EFT, Credit Card
        referenceNumber: '', // e.g., Check #, Transaction ID
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    // State for payment summary
    const [paidToDate, setPaidToDate] = useState(0);
    const [balanceDue, setBalanceDue] = useState(invoiceAmount || 0);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;
        // Allow only numbers and one decimal for amount
        if (name === 'amountPaid' && value && !/^[0-9]*\.?[0-9]*$/.test(value)) {
            return;
        }
        setPaymentData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(''); // Clear error on change
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        // Basic Validation
        const amount = parseFloat(paymentData.amountPaid);
        if (isNaN(amount) || amount <= 0) {
            setError('Please enter a valid positive payment amount.');
            return;
        }
        if (!paymentData.paymentDate) {
            setError('Please enter a payment date.');
            return;
        }

        setIsSubmitting(true);
        try {
            // *** TODO: Need api.recordInvoicePayment function in services/api.js ***
            const response = await api.recordInvoicePayment(invoiceId, {
                ...paymentData,
                amountPaid: amount // Send parsed amount
            });
            
            if (response.success) {
                onPaymentRecorded(response.message || 'Payment recorded successfully.'); // Notify parent
                onClose(); // Close dialog on success
            } else {
                throw new Error(response.message || 'Failed to record payment.');
            }
        } catch (err) {
            console.error('Error recording payment:', err);
            setError(err.message || 'An error occurred while recording the payment.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset form and fetch payment summary when dialog opens
    React.useEffect(() => {
        if (open && invoiceId) {
            // Reset form state
            setPaymentData({
                paymentDate: new Date().toISOString().split('T')[0],
                amountPaid: '',
                paymentMethod: '',
                referenceNumber: '',
                notes: ''
            });
            setError('');
            setIsSubmitting(false);

            // Fetch payment history to calculate summary
            const fetchPaymentSummary = async () => {
                setIsLoadingSummary(true);
                try {
                    const payments = await api.getInvoicePayments(invoiceId);
                    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amountpaid || 0), 0);
                    const originalAmount = parseFloat(invoiceAmount || 0);
                    setPaidToDate(totalPaid);
                    setBalanceDue(originalAmount - totalPaid);
                    console.log(`[RecordPaymentDialog] Payment summary loaded: Paid=${totalPaid}, Balance=${originalAmount - totalPaid}`);
                } catch (err) {
                    console.error('Error loading payment summary:', err);
                    // Don't block the dialog, but maybe show a small error?
                    // For now, just default to 0 paid / full balance
                    setPaidToDate(0);
                    setBalanceDue(parseFloat(invoiceAmount || 0));
                } finally {
                    setIsLoadingSummary(false);
                }
            };
            fetchPaymentSummary();
        }
    }, [open, invoiceId, invoiceAmount]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Record Payment for Invoice #{invoiceNumber}</DialogTitle>
            <DialogContent dividers>
                {/* Payment Summary Section */}
                <Box sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Invoice Summary:</Typography>
                    {isLoadingSummary ? (
                        <CircularProgress size={20} />
                    ) : (
                        <Grid container spacing={0.5}>
                            <Grid item xs={6}><Typography variant="body2">Original Amount:</Typography></Grid>
                            <Grid item xs={6}><Typography variant="body2" align="right">{formatCurrency(invoiceAmount)}</Typography></Grid>
                            <Grid item xs={6}><Typography variant="body2">Paid to Date:</Typography></Grid>
                            <Grid item xs={6}><Typography variant="body2" align="right">{formatCurrency(paidToDate)}</Typography></Grid>
                            <Grid item xs={6}><Typography variant="body2"><strong>Balance Due:</strong></Typography></Grid>
                            <Grid item xs={6}><Typography variant="body2" align="right"><strong>{formatCurrency(balanceDue)}</strong></Typography></Grid>
                        </Grid>
                    )}
                </Box>
                <Divider sx={{ mb: 2 }}/>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Grid container spacing={2} component="form" id="payment-form" onSubmit={handleSubmit}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Payment Date"
                            name="paymentDate"
                            type="date"
                            value={paymentData.paymentDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            required
                            disabled={isSubmitting}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Amount Paid"
                            name="amountPaid"
                            type="text" // Use text to allow decimal input, validated in handler
                            value={paymentData.amountPaid}
                            onChange={handleChange}
                            InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography> }}
                            fullWidth
                            required
                            disabled={isSubmitting}
                        />
                    </Grid>
                     <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel id="payment-method-label">Payment Method</InputLabel>
                            <Select
                                labelId="payment-method-label"
                                name="paymentMethod"
                                value={paymentData.paymentMethod}
                                label="Payment Method"
                                onChange={handleChange}
                                disabled={isSubmitting}
                            >
                                <MenuItem value=""><em>None</em></MenuItem>
                                <MenuItem value="Check">Check</MenuItem>
                                <MenuItem value="EFT">EFT / Bank Transfer</MenuItem>
                                <MenuItem value="Credit Card">Credit Card</MenuItem>
                                <MenuItem value="Cash">Cash</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                         <TextField
                            label="Reference # (Optional)"
                            name="referenceNumber"
                            value={paymentData.referenceNumber}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Notes (Optional)"
                            name="notes"
                            value={paymentData.notes}
                            onChange={handleChange}
                            multiline
                            rows={2}
                            fullWidth
                            disabled={isSubmitting}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" form="payment-form" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : 'Record Payment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RecordPaymentDialog; 