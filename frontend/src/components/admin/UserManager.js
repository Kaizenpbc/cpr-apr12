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
    IconButton,
    Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// Import Add/Edit Dialog component
import UserDialog from './UserDialog';
// Phone formatting
import { formatPhoneNumber } from 'react-phone-number-input';

// Helper to safely format phone numbers (copied from OrganizationManager)
const formatPhone = (phoneString) => {
    if (!phoneString) return '-';
    return formatPhoneNumber(phoneString) || phoneString; 
};

function UserManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // State for Add/Edit Dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null for Add, user object for Edit
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' }); // Add Snackbar state

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getUsers();
            setUsers(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddOpen = () => {
        setEditingUser(null); // Set to null for Add mode
        setDialogOpen(true);
        // alert('Add User dialog not implemented yet.'); // Removed placeholder
    };

    const handleEditOpen = (user) => {
        setEditingUser(user); // Set the user data for Edit mode
        setDialogOpen(true);
        // alert(`Edit User ${user.userid} dialog not implemented yet.`); // Removed placeholder
    };

    const handleDelete = async (userId) => {
        // Use user details from state to show name in confirmation
        const userToDelete = users.find(u => u.userid === userId);
        const confirmMessage = userToDelete 
            ? `Are you sure you want to delete user: ${userToDelete.username} (ID: ${userId})?`
            : `Are you sure you want to delete user ID ${userId}?`;

        if (window.confirm(confirmMessage)) {
            // alert(`DELETE User ${userId} API call not implemented yet.`); // Remove placeholder
            try {
                setError(''); // Clear previous table errors
                const response = await api.deleteUser(userId);
                if (response.success) {
                    showSnackbar(`User ${userId} deleted successfully.`, 'success');
                    fetchUsers(); // Refresh list
                } else {
                    // Throw error if API returns success: false
                    throw new Error(response.message || 'Deletion failed on server.');
                }
            } catch (err) {
                console.error(`Error deleting user ${userId}:`, err);
                showSnackbar(err.message || 'Failed to delete user.', 'error');
            }
        }
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingUser(null);
    };

    const handleDialogSave = () => {
        fetchUsers(); // Refresh list after save
        // Dialog will close itself via its own logic
    };

    // --- Define showSnackbar helper ---
    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Users</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddOpen}
                >
                    Add User
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>First Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Last Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">No users found.</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.userid} hover>
                                        <TableCell>{user.userid}</TableCell>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.firstname || '-'}</TableCell>
                                        <TableCell>{user.lastname || '-'}</TableCell>
                                        <TableCell>{user.email || '-'}</TableCell>
                                        <TableCell>{formatPhone(user.phone)}</TableCell>
                                        <TableCell>{user.organizationname || 'N/A'}</TableCell>
                                        <TableCell>{user.role}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => handleEditOpen(user)} title="Edit">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(user.userid)} title="Delete">
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

            {/* Add/Edit Dialog */}
            <UserDialog 
                open={dialogOpen} 
                onClose={handleDialogClose} 
                onSave={handleDialogSave}
                user={editingUser} 
                existingUsers={users}
            />

        </Paper>
    );
}

export default UserManager; 