import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, CircularProgress,
    Alert, IconButton, Tooltip, Snackbar,
    FormControl, InputLabel, Select, MenuItem, TableSortLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PricingRuleDialog from './PricingRuleDialog'; // Import the dialog

function PricingManager() {
    const [pricingRules, setPricingRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // State for filtering
    const [organizations, setOrganizations] = useState([]);
    const [courseTypes, setCourseTypes] = useState([]);
    const [filterOrg, setFilterOrg] = useState(''); // Selected Org ID for filtering
    const [filterType, setFilterType] = useState(''); // Selected Course Type ID for filtering

    // State for sorting
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('organizationname'); // Default sort column

    // Fetch pricing rules and lists for filters
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch rules, orgs, and types concurrently
            const [rulesData, orgData, typeData] = await Promise.all([
                api.getPricingRules(),
                api.getOrganizations(), 
                api.getCourseTypes()
            ]);
            setPricingRules(rulesData || []);
            setOrganizations(orgData || []);
            setCourseTypes(typeData || []);
        } catch (err) {
            setError(err.message || 'Failed to load data.');
            // Clear all states on error?
            setPricingRules([]);
            setOrganizations([]);
            setCourseTypes([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddOpen = () => {
        setEditingRule(null);
        setDialogOpen(true);
        // alert('Add Pricing Rule dialog not implemented yet.'); // Removed placeholder
    };

    const handleEditOpen = (rule) => {
        setEditingRule(rule);
        setDialogOpen(true);
        // alert(`Edit Pricing Rule ${rule.pricingid} dialog not implemented yet.`); // Removed placeholder
    };

    const handleDelete = async (id) => {
        if (window.confirm(`Are you sure you want to delete Pricing Rule ID ${id}?`)) {
             try {
                 setError('');
                 const response = await api.deletePricingRule(id);
                 if (response.success) {
                     showSnackbar(`Pricing Rule ${id} deleted successfully.`, 'success');
                     fetchData(); // Refresh list
                 } else {
                     throw new Error(response.message || 'Deletion failed on server.');
                 }
             } catch (err) {
                 console.error(`Error deleting pricing rule ${id}:`, err);
                 showSnackbar(err.message || 'Failed to delete pricing rule.', 'error');
             }
        }
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingRule(null);
    };

    const handleDialogSave = () => {
        fetchData(); // Refresh all data after save
    };

    // Sorting handler
    const handleSortRequest = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // Filtering and Sorting Logic
    const getProcessedRules = () => {
        let filtered = [...pricingRules];

        // Apply filters
        if (filterOrg) {
            filtered = filtered.filter(rule => rule.organizationid === parseInt(filterOrg, 10));
        }
        if (filterType) {
            filtered = filtered.filter(rule => rule.coursetypeid === parseInt(filterType, 10));
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let compareA, compareB;
            switch (orderBy) {
                case 'organizationname':
                    compareA = a.organizationname || '';
                    compareB = b.organizationname || '';
                    break;
                case 'coursetypename':
                    compareA = a.coursetypename || '';
                    compareB = b.coursetypename || '';
                    break;
                case 'price':
                    compareA = Number(a.price) || 0;
                    compareB = Number(b.price) || 0;
                    break;
                default:
                    compareA = a.pricingid;
                    compareB = b.pricingid;
            }

            if (compareB < compareA) {
                return (order === 'asc' ? 1 : -1);
            }
            if (compareB > compareA) {
                return (order === 'asc' ? -1 : 1);
            }
            return 0;
        });

        return filtered;
    };

    const processedRules = getProcessedRules();

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Pricing Rules</Typography>
                {/* Filter Controls */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                     <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="org-filter-label">Filter by Organization</InputLabel>
                        <Select
                            labelId="org-filter-label"
                            value={filterOrg}
                            label="Filter by Organization"
                            onChange={(e) => setFilterOrg(e.target.value)}
                        >
                            <MenuItem value=""><em>All Organizations</em></MenuItem>
                            {organizations.map((org) => (
                                <MenuItem key={org.organizationid} value={org.organizationid}>
                                    {org.organizationname}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                     <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel id="ctype-filter-label">Filter by Course Type</InputLabel>
                        <Select
                            labelId="ctype-filter-label"
                            value={filterType}
                            label="Filter by Course Type"
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <MenuItem value=""><em>All Course Types</em></MenuItem>
                            {courseTypes.map((ct) => (
                                <MenuItem key={ct.coursetypeid} value={ct.coursetypeid}>
                                    {ct.coursetypename} ({ct.coursecode})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                     <Button 
                        size="small" 
                        onClick={() => {setFilterOrg(''); setFilterType('');}}
                        disabled={!filterOrg && !filterType}
                    >
                        Clear Filters
                    </Button>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddOpen}
                >
                    Add Pricing Rule
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Rule ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                     <TableSortLabel
                                        active={orderBy === 'organizationname'}
                                        direction={orderBy === 'organizationname' ? order : 'asc'}
                                        onClick={() => handleSortRequest('organizationname')}
                                    >
                                        Organization
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                     <TableSortLabel
                                        active={orderBy === 'coursetypename'}
                                        direction={orderBy === 'coursetypename' ? order : 'asc'}
                                        onClick={() => handleSortRequest('coursetypename')}
                                    >
                                        Course Type
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>
                                     <TableSortLabel
                                        active={orderBy === 'price'}
                                        direction={orderBy === 'price' ? order : 'asc'}
                                        onClick={() => handleSortRequest('price')}
                                    >
                                        Price ($)
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {processedRules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">No pricing rules found.</TableCell>
                                </TableRow>
                            ) : (
                                processedRules.map((rule) => (
                                    <TableRow key={rule.pricingid} hover>
                                        <TableCell>{rule.pricingid}</TableCell>
                                        <TableCell>{rule.organizationname} (ID: {rule.organizationid})</TableCell>
                                        <TableCell>{rule.coursetypename} (ID: {rule.coursetypeid})</TableCell>
                                        <TableCell>{Number(rule.price).toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Tooltip title="Edit Price">
                                                <IconButton size="small" onClick={() => handleEditOpen(rule)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Rule">
                                                <IconButton size="small" onClick={() => handleDelete(rule.pricingid)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            
            {/* Add/Edit Dialog */}
            <PricingRuleDialog 
                open={dialogOpen} 
                onClose={handleDialogClose} 
                onSave={handleDialogSave}
                rule={editingRule} 
            /> 
            
            {/* Snackbar for feedback */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={() => setSnackbar({ ...snackbar, open: false })} 
                    severity={snackbar.severity} 
                    variant="filled" 
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Paper>
    );
}

export default PricingManager; 