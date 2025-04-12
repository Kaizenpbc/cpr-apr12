import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Paper,
    Grid,
    Divider,
    Link
} from '@mui/material';
import * as api from '../services/api'; // Adjust path as needed
// Import necessary table components
import OrgInvoiceHistoryTable from '../components/tables/OrgInvoiceHistoryTable';
import OrgCourseHistoryTable from '../components/tables/OrgCourseHistoryTable'; // Import course table
// TODO: Import OrgCourseHistoryTable when created

// Helper function to format currency
const formatCurrency = (amount) => {
    if (amount == null || isNaN(amount)) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
};

const OrganizationDetailPage = () => {
    const { orgId } = useParams(); // Get orgId from URL
    const [orgDetails, setOrgDetails] = useState(null);
    const [orgCourses, setOrgCourses] = useState([]);
    const [orgInvoices, setOrgInvoices] = useState([]);
    // const [orgPayments, setOrgPayments] = useState([]); // Fetch payments later if needed
    const [financialSummary, setFinancialSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadOrgData = async () => {
            if (!orgId) {
                setError('Organization ID not found in URL.');
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError('');
            console.log(`[OrganizationDetailPage] Loading data for Org ID: ${orgId}`);
            try {
                // Fetch all data concurrently
                const [detailsRes, coursesRes, invoicesRes, summaryRes] = await Promise.all([
                    api.getOrganizationDetails(orgId),
                    api.getOrganizationCoursesAdmin(orgId),
                    api.getOrganizationInvoices(orgId),
                    api.getOrganizationFinancialSummary(orgId)
                ]);

                setOrgDetails(detailsRes);
                setOrgCourses(coursesRes || []);
                setOrgInvoices(invoicesRes || []);
                setFinancialSummary(summaryRes);

                console.log('[OrganizationDetailPage] All data loaded.');

            } catch (err) {
                console.error(`Error loading organization data for ID ${orgId}:`, err);
                setError(err.message || 'Failed to load organization data.');
                // Clear potentially partial data
                setOrgDetails(null);
                setOrgCourses([]);
                setOrgInvoices([]);
                setFinancialSummary(null);
            } finally {
                setIsLoading(false);
            }
        };
        loadOrgData();
    }, [orgId]);

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    if (!orgDetails) {
        // Should have been caught by error, but safety check
        return <Alert severity="warning" sx={{ m: 2 }}>Organization data could not be loaded.</Alert>;
    }

    return (
        <Container maxWidth="lg">
            {/* Header Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h4" gutterBottom>{orgDetails.organizationname}</Typography>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1">Contact Information</Typography>
                        <Typography variant="body2">Name: {orgDetails.contactname || '-'}</Typography>
                        <Typography variant="body2">Email: {orgDetails.contactemail || '-'}</Typography>
                        <Typography variant="body2">Phone: {orgDetails.contactphone || '-'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1">Address</Typography>
                        <Typography variant="body2">{orgDetails.addressstreet || '-'}</Typography>
                        <Typography variant="body2">{`${orgDetails.addresscity || ''}, ${orgDetails.addressprovince || ''} ${orgDetails.addresspostalcode || ''}`}</Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Financial Summary Section */}
            {financialSummary && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Financial Summary</Typography>
                     <Grid container spacing={1}>
                         <Grid item xs={4}><Typography variant="body1">Total Invoiced:</Typography></Grid>
                         <Grid item xs={8}><Typography variant="body1" align="right">{formatCurrency(financialSummary.totalInvoiced)}</Typography></Grid>
                         <Grid item xs={4}><Typography variant="body1">Total Paid:</Typography></Grid>
                         <Grid item xs={8}><Typography variant="body1" align="right">{formatCurrency(financialSummary.totalPaid)}</Typography></Grid>
                         <Grid item xs={4}><Typography variant="body1" sx={{fontWeight: 'bold'}}>Balance Due:</Typography></Grid>
                         <Grid item xs={8}><Typography variant="body1" align="right" sx={{fontWeight: 'bold'}}>{formatCurrency(financialSummary.balanceDue)}</Typography></Grid>
                     </Grid>
                </Paper>
            )}

            {/* Invoice History Section */}
             <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Invoice History</Typography>
                <OrgInvoiceHistoryTable invoices={orgInvoices} />
             </Paper>

            {/* Course History Section */}
             <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Course History</Typography>
                <OrgCourseHistoryTable courses={orgCourses} />
             </Paper>

        </Container>
    );
};

export default OrganizationDetailPage; 