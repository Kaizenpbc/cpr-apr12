import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, CircularProgress,
    Alert, IconButton, Tooltip, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PricingRuleDialog from './PricingRuleDialog';
import { formatCurrency } from '../../utils/formatters'; // Import formatter

function PricingRuleManager() {
    const [pricingRules, setPricingRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    const fetchPricingRules = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getPricingRules();
            setPricingRules(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load pricing rules.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPricingRules();
    }, [fetchPricingRules]);

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleAddOpen = () => {
        setEditingRule(null);
        setDialogOpen(true);
    };

    const handleEditOpen = (rule) => {
        setEditingRule(rule);
        setDialogOpen(true);
    };

    const handleDelete = async (id) => {
        // Confirmation
        if (window.confirm(`Are you sure you want to delete Pricing Rule ID: ${id}? This cannot be undone.`)) {
            try {
                setError('');
                const response = await api.deletePricingRule(id);
                if (response.success) {
                    showSnackbar(`Pricing Rule ${id} deleted successfully.`, 'success');
                    fetchPricingRules(); // Refresh list
                } else {
                    throw new Error(response.message || 'Deletion failed on server.');
                }
            } catch (err) {
                console.error(`Error deleting pricing rule ${id}:`, err);
                showSnackbar(err.message || 'Failed to delete pricing rule.', 'error');
            }
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingRule(null);
    };

    const handleDialogSave = () => {
        fetchPricingRules(); // Refresh list after save
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            {/* Header Section */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Pricing Rules</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddOpen}>
                    Add Pricing Rule
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            {/* Ensure TableContainer and contents are correctly placed */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} variant="outlined"> {/* Use outlined variant */}
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Price</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead> 
                        <TableBody>
                            {pricingRules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">No pricing rules found.</TableCell>
                                </TableRow>
                            ) : (
                                pricingRules.map((rule, index) => (
                                    <TableRow 
                                        key={rule.pricingid} 
                                        hover
                                        sx={{ backgroundColor: index % 2 !== 0 ? '#f9f9f9' : 'inherit' }}
                                    >
                                        <TableCell>{rule.pricingid}</TableCell>
                                        <TableCell>{rule.organizationname || 'All Orgs'}</TableCell> {/* Display name */}
                                        <TableCell>{rule.coursetypename || 'All Types'}</TableCell> {/* Display name */}
                                        <TableCell align="right">{formatCurrency(rule.price)}</TableCell>
                                        <TableCell align="center">
                                             <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                <Tooltip title="Edit">
                                                    <IconButton size="small" onClick={() => handleEditOpen(rule)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => handleDelete(rule.pricingid)} color="error">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody> 
                    </Table>
                </TableContainer>
            )}

            {/* Snackbar for feedback */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {/* Add/Edit Dialog */}
            <PricingRuleDialog
                 open={dialogOpen}
                 onClose={handleDialogClose}
                 onSave={handleDialogSave}
                 rule={editingRule}
            />
        </Paper>
    );
}

export default PricingRuleManager; 