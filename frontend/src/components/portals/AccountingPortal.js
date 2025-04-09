import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import {
    Box,
    Container,
    Typography,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    CircularProgress,
    Alert,
    Snackbar,
    Button // Added Button back for potential use
} from '@mui/material';
import {
    ReceiptLong as BillingIcon, 
    RequestQuote as ReceivablesIcon, // Example icon
    Logout as LogoutIcon,
} from '@mui/icons-material';
import ReadyForBillingTable from '../tables/ReadyForBillingTable'; // Import the table
import AccountsReceivableTable from '../tables/AccountsReceivableTable'; // Import AR table
// Import ViewStudentsDialog if needed for the Review button
import ViewStudentsDialog from '../dialogs/ViewStudentsDialog'; 
import InvoiceDetailDialog from '../dialogs/InvoiceDetailDialog'; // Import Invoice Detail Dialog

const drawerWidth = 240;

const AccountingPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState('billingReady'); // Default view
    // State for Billing Ready view
    const [billingQueue, setBillingQueue] = useState([]);
    const [isLoadingBillingQueue, setIsLoadingBillingQueue] = useState(false);
    const [billingQueueError, setBillingQueueError] = useState('');
    // State for View Students dialog
    const [showViewStudentsDialog, setShowViewStudentsDialog] = useState(false);
    const [selectedCourseForView, setSelectedCourseForView] = useState(null);
    // State for success/error messages
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    // Add state for AR view
    const [invoices, setInvoices] = useState([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [invoicesError, setInvoicesError] = useState('');
    // Add state for Invoice Detail Dialog
    const [showInvoiceDetailDialog, setShowInvoiceDetailDialog] = useState(false);
    const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState(null);

    // Handler to load billing queue
    const loadBillingQueue = useCallback(async () => {
        setIsLoadingBillingQueue(true);
        setBillingQueueError('');
        console.log('[loadBillingQueue] Fetching billing queue...');
        try {
            const data = await api.getBillingQueue();
            console.log('[loadBillingQueue] API Response:', data);
            setBillingQueue(data || []);
            console.log('[loadBillingQueue] State updated:', data || []);
        } catch (err) {
            const errorMsg = err.message || 'Failed to load queue.';
            console.error('Error loading billing queue:', err);
            setBillingQueueError(errorMsg);
             console.log('[loadBillingQueue] Error state set:', errorMsg);
            setBillingQueue([]);
        } finally {
            setIsLoadingBillingQueue(false);
            console.log('[loadBillingQueue] Finished.');
        }
    }, []);

    // Handler to load invoices
    const loadInvoices = useCallback(async () => {
        setIsLoadingInvoices(true);
        setInvoicesError('');
        console.log('[loadInvoices] Fetching invoices...');
        try {
            const data = await api.getInvoices();
            console.log('[loadInvoices] API Response:', data);
            setInvoices(data || []);
            console.log('[loadInvoices] State updated:', data || []);
        } catch (err) {
            const errorMsg = err.message || 'Failed to load invoices.';
            console.error('Error loading invoices:', err);
            setInvoicesError(errorMsg);
            console.log('[loadInvoices] Error state set:', errorMsg);
            setInvoices([]);
        } finally {
            setIsLoadingInvoices(false);
            console.log('[loadInvoices] Finished.');
        }
    }, []);

    // Load data based on selected view
    useEffect(() => {
        if (selectedView === 'billingReady') {
            loadBillingQueue();
        } else if (selectedView === 'receivables') {
            loadInvoices(); // Load invoices for AR view
        }
    }, [selectedView, loadBillingQueue, loadInvoices]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // --- Action Handlers ---
    const handleCreateInvoiceClick = async (course) => {
        console.log("Create Invoice clicked for course:", course);
        // alert("Create Invoice functionality not yet implemented."); // Remove alert
        // Maybe add a confirmation dialog here?
        try {
            const response = await api.createInvoice(course.courseid);
            if (response.success) {
                setSnackbar({ open: true, message: response.message || 'Invoice created!', severity: 'success' });
                // Refresh the billing queue (the invoiced course should disappear)
                loadBillingQueue();
            } else {
                 setSnackbar({ open: true, message: response.message || 'Failed to create invoice.', severity: 'error' });
            }
        } catch (err) {
            console.error("Error creating invoice:", err);
            setSnackbar({ open: true, message: err.message || 'An error occurred.', severity: 'error' });
        }
    };

    const handleReviewCourseClick = (courseId) => {
        console.log("Review/View Details clicked for course:", courseId);
        setSelectedCourseForView(courseId);
        setShowViewStudentsDialog(true);
    };

    const handleViewStudentsDialogClose = () => {
        setShowViewStudentsDialog(false);
        setSelectedCourseForView(null);
    };

    // Add placeholder handlers for AR table buttons
    const handleRecordPaymentClick = (invoiceId) => {
        console.log("Record Payment clicked for invoice:", invoiceId);
        alert("Record Payment functionality not yet implemented.");
        // TODO: Implement payment recording logic (maybe open modal, call API)
    };

    // handleViewDetailsClick can likely reuse handleReviewCourseClick
    const handleViewDetailsClick = (invoiceId) => {
        console.log("View Details clicked for invoice:", invoiceId);
        setSelectedInvoiceForDetail(invoiceId);
        setShowInvoiceDetailDialog(true);
    };

    // Close handler for Invoice Detail Dialog
    const handleInvoiceDetailDialogClose = () => {
        setShowInvoiceDetailDialog(false);
        setSelectedInvoiceForDetail(null);
    };

    const handleEmailInvoiceClick = async (invoiceId) => {
        console.log(`Email Invoice clicked for invoice: ${invoiceId}`);
        // alert("Email Invoice functionality not yet implemented."); // Remove alert
        try {
            // Call the new API function
            const response = await api.emailInvoice(invoiceId);
            if (response.success) {
                let message = response.message || 'Email queued successfully.';
                // If using Ethereal, log the preview URL
                if (response.previewUrl) {
                    console.log('Ethereal Preview URL:', response.previewUrl);
                    message += ' Ethereal preview link logged to console.';
                }
                setSnackbar({ open: true, message: message, severity: 'success' });
                // Optionally close the detail dialog if email is sent from there
                // setShowInvoiceDetailDialog(false);
                // setSelectedInvoiceForDetail(null);
            } else {
                throw new Error(response.message || 'Failed to send email via API.');
            }
        } catch (err) {
            console.error(`Error sending email for invoice ${invoiceId}:`, err);
            setSnackbar({ open: true, message: err.message || 'Failed to send email.', severity: 'error' });
        }
    };
    // --- End Action Handlers ---

    const renderSelectedView = () => {
        console.log(`[renderSelectedView] Rendering view: ${selectedView}`);
        switch (selectedView) {
            case 'billingReady':
                console.log(`[renderSelectedView: billingReady] State: isLoading=${isLoadingBillingQueue}, error=${billingQueueError}, queue=${JSON.stringify(billingQueue)}`);
                if (isLoadingBillingQueue) return <CircularProgress />;
                if (billingQueueError) return <Alert severity="error">{billingQueueError}</Alert>;
                return (
                    <ReadyForBillingTable 
                        courses={billingQueue} 
                        onCreateInvoiceClick={handleCreateInvoiceClick}
                        onReviewClick={handleReviewCourseClick}
                    />
                );
            case 'receivables':
                if (isLoadingInvoices) return <CircularProgress />;
                if (invoicesError) return <Alert severity="error">{invoicesError}</Alert>;
                return (
                    <AccountsReceivableTable 
                        invoices={invoices}
                        onRecordPaymentClick={handleRecordPaymentClick}
                        onViewDetailsClick={handleViewDetailsClick} 
                        onEmailInvoiceClick={handleEmailInvoiceClick} 
                    />
                );
            default:
                return <Typography>Select a view</Typography>;
        }
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        mt: 8,
                        height: 'calc(100% - 64px)'
                    },
                }}
            >
                 <Box sx={{ overflow: 'auto' }}>
                     <List>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'billingReady'}
                            onClick={() => setSelectedView('billingReady')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><BillingIcon /></ListItemIcon>
                            <ListItemText primary="Ready for Billing" />
                        </ListItem>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'receivables'}
                            onClick={() => setSelectedView('receivables')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><ReceivablesIcon /></ListItemIcon>
                            <ListItemText primary="Accounts Receivable" />
                        </ListItem>
                        <Divider sx={{ my: 1 }} />
                        <ListItem 
                            component="div"
                            onClick={handleLogout}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><LogoutIcon /></ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItem>
                     </List>
                 </Box>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <Container maxWidth="lg">
                    <Typography variant="h4" gutterBottom>
                        Welcome, {user?.FirstName || 'Accounting User'}
                    </Typography>
                    {renderSelectedView()}
                </Container>
            </Box>

            {/* View Students Dialog for Review button */}
            {showViewStudentsDialog && (
                <ViewStudentsDialog
                    open={showViewStudentsDialog}
                    onClose={handleViewStudentsDialogClose}
                    courseId={selectedCourseForView}
                />
            )}

            {/* Invoice Detail Dialog */}
            {showInvoiceDetailDialog && (
                <InvoiceDetailDialog
                    open={showInvoiceDetailDialog}
                    onClose={handleInvoiceDetailDialogClose}
                    invoiceId={selectedInvoiceForDetail}
                    // Pass email handler down
                    onEmailClick={handleEmailInvoiceClick} 
                />
            )}

            {/* Snackbar for potential future messages */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AccountingPortal; 