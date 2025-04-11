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
import CourseTypeDialog from './CourseTypeDialog'; // Import the dialog

function CourseTypeManager() {
    const [courseTypes, setCourseTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' }); // Added Snackbar state
    const [dialogOpen, setDialogOpen] = useState(false); // Uncomment state
    const [editingCourseType, setEditingCourseType] = useState(null); // Uncomment state

    const fetchCourseTypes = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getCourseTypes();
            setCourseTypes(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load course types.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCourseTypes();
    }, [fetchCourseTypes]);

    const handleAddOpen = () => {
        setEditingCourseType(null);
        setDialogOpen(true);
        // alert('Add Course Type dialog not implemented yet.'); // Remove placeholder
    };

    const handleEditOpen = (courseType) => {
        setEditingCourseType(courseType);
        setDialogOpen(true);
        // alert(`Edit Course Type ${courseType.coursetypeid} dialog not implemented yet.`); // Remove placeholder
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete Course Type: ${name} (ID: ${id})? This cannot be undone.`)) {
            // alert(`DELETE Course Type ${id} API call not implemented yet.`); // Remove placeholder
            try {
                setError(''); // Clear previous table errors
                const response = await api.deleteCourseType(id);
                if (response.success) {
                    showSnackbar(`Course Type ${id} deleted successfully.`, 'success');
                    fetchCourseTypes(); // Refresh list
                } else {
                    // Throw error if API returns success: false
                    throw new Error(response.message || 'Deletion failed on server.');
                }
            } catch (err) {
                console.error(`Error deleting course type ${id}:`, err);
                showSnackbar(err.message || 'Failed to delete course type.', 'error');
                // Optionally set the table error state as well
                // setError(err.message || 'Failed to delete course type.'); 
            }
        }
    };

    // --- Define showSnackbar helper ---
    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingCourseType(null);
    };

    const handleDialogSave = () => {
        fetchCourseTypes(); // Refresh list after save
        // Dialog closes itself
    };

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Course Types</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddOpen}
                >
                    Add Course Type
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
                                <TableCell sx={{ fontWeight: 'bold' }}>Course Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Course Code</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Duration (hrs)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Max Students</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {courseTypes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">No course types found.</TableCell>
                                </TableRow>
                            ) : (
                                courseTypes.map((ct) => (
                                    <TableRow key={ct.coursetypeid} hover>
                                        <TableCell>{ct.coursetypeid}</TableCell>
                                        <TableCell>{ct.coursetypename}</TableCell>
                                        <TableCell>{ct.coursecode}</TableCell>
                                        <TableCell>{ct.description || '-'}</TableCell>
                                        <TableCell>{ct.duration ?? '-'}</TableCell>
                                        <TableCell>{ct.maxstudents ?? '-'}</TableCell>
                                        <TableCell>
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => handleEditOpen(ct)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" onClick={() => handleDelete(ct.coursetypeid, ct.coursetypename)}>
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
            <CourseTypeDialog 
                open={dialogOpen} 
                onClose={handleDialogClose} 
                onSave={handleDialogSave}
                courseType={editingCourseType} 
            />

        </Paper>
    );
}

export default CourseTypeManager; 