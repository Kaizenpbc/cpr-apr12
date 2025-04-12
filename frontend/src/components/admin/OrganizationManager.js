import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// Import Add/Edit Dialog component
import OrganizationDialog from './OrganizationDialog';
// Phone formatting
import { formatPhoneNumber, formatPhoneNumberIntl } from 'react-phone-number-input'; // Use built-in formatters

// Helper to safely format phone numbers
const formatPhone = (phoneString) => {
    if (!phoneString) return '-';
    // Use formatPhoneNumber for national format, formatPhoneNumberIntl for international
    // formatPhoneNumber might return undefined if invalid, so handle that
    return formatPhoneNumber(phoneString) || phoneString; // Fallback to original string if formatting fails
};

function OrganizationManager() {
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // State for Add/Edit Dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState(null); // null for Add, org object for Edit

    const fetchOrganizations = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getOrganizations();
            setOrganizations(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load organizations.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    const handleAddOpen = () => {
        setEditingOrg(null); // Set to null for Add mode
        setDialogOpen(true);
        // alert('Add Organization dialog not implemented yet.'); // Remove placeholder
    };

    const handleEditOpen = (org) => {
        setEditingOrg(org); // Set the org data for Edit mode
        setDialogOpen(true);
        // alert(`Edit Organization ${org.organizationid} dialog not implemented yet.`); // Remove placeholder
    };

    const handleDelete = async (orgId) => {
        // Add confirmation dialog later
        if (window.confirm(`Are you sure you want to delete organization ID ${orgId}?`)) {
             alert(`DELETE Organization ${orgId} API call not implemented yet.`); // Placeholder
            // Implement actual delete API call later
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingOrg(null);
    };

    const handleDialogSave = () => {
        fetchOrganizations(); // Refresh list after save
        // Dialog will close itself via its own logic
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Organizations</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddOpen}
                >
                    Add Organization
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
            ) : (
                <TableContainer>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Organization Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Contact Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {organizations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">No organizations found.</TableCell>
                                </TableRow>
                            ) : (
                                organizations.map((org, index) => (
                                    <TableRow 
                                        key={org.organizationid} 
                                        hover
                                        sx={{ 
                                            backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit'
                                        }}
                                    >
                                        <TableCell>{org.organizationid}</TableCell>
                                        <TableCell>{org.organizationname}</TableCell>
                                        <TableCell>{org.contactname || '-'}</TableCell>
                                        <TableCell>{org.contactemail || '-'}</TableCell>
                                        <TableCell>{formatPhone(org.contactphone)}</TableCell>
                                        <TableCell>{`${org.addressstreet || ''}${org.addressstreet && (org.addresscity || org.addressprovince) ? ', ' : ''}${org.addresscity || ''}${org.addresscity && org.addressprovince ? ', ' : ''}${org.addressprovince || ''}` || '-'}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => handleEditOpen(org)} title="Edit">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(org.organizationid)} title="Delete">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add/Edit Dialog */}
            <OrganizationDialog 
                open={dialogOpen} 
                onClose={handleDialogClose} 
                onSave={handleDialogSave}
                organization={editingOrg} 
            />

        </Paper>
    );
}

export default OrganizationManager; 