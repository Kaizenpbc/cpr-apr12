import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Typography,
    Box,
    CircularProgress,
    Alert
} from '@mui/material';
import * as api from '../../services/api';

const ScheduleCourseDialog = ({ open, onClose, course, onCourseScheduled }) => {
    const [instructors, setInstructors] = useState([]);
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);
    const [selectedInstructorId, setSelectedInstructorId] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [error, setError] = useState('');

    // Set initial date when course data is available
    useEffect(() => {
        if (course?.daterequested) {
            // Format to YYYY-MM-DD for date input
            try {
                const initialDate = new Date(course.daterequested).toISOString().split('T')[0];
                setScheduledDate(initialDate);
            } catch (e) {
                console.error("Error formatting initial date", e);
                setScheduledDate('');
            }
        }
    }, [course]);

    // Fetch instructors when dialog opens
    useEffect(() => {
        if (open) {
            const fetchInstructors = async () => {
                setIsLoadingInstructors(true);
                setError('');
                try {
                    const data = await api.getAllInstructors();
                    setInstructors(data || []);
                } catch (err) {
                    setError(err.message || 'Failed to load instructors');
                    setInstructors([]);
                } finally {
                    setIsLoadingInstructors(false);
                }
            };
            fetchInstructors();
        }
    }, [open]);

    const handleSchedule = async () => {
        if (!selectedInstructorId || !scheduledDate) {
            setError('Please select an instructor and a valid date.');
            return;
        }
        setIsScheduling(true);
        setError('');
        try {
            const response = await api.scheduleCourseAdmin(course.courseid, {
                instructorId: selectedInstructorId,
                dateScheduled: scheduledDate,
            });
            if (response.success) {
                onCourseScheduled(response.course); // Notify parent
                onClose(); // Close dialog
            } else {
                setError(response.message || 'Failed to schedule course.');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while scheduling.');
        } finally {
            setIsScheduling(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Schedule Course: {course?.coursenumber}</DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Typography variant="body2" gutterBottom>Organization: {course?.organizationname}</Typography>
                <Typography variant="body2" gutterBottom>Location: {course?.location}</Typography>
                <Typography variant="body2" gutterBottom>Requested Date: {course?.daterequested ? new Date(course.daterequested).toLocaleDateString() : '-'}</Typography>
                
                <FormControl fullWidth margin="normal" required disabled={isLoadingInstructors || isScheduling}>
                    <InputLabel id="instructor-select-label">Assign Instructor</InputLabel>
                    <Select
                        labelId="instructor-select-label"
                        value={selectedInstructorId}
                        label="Assign Instructor"
                        onChange={(e) => setSelectedInstructorId(e.target.value)}
                    >
                        {isLoadingInstructors ? (
                             <MenuItem disabled value=""><CircularProgress size={20} sx={{ mr: 1 }}/> Loading...</MenuItem>
                        ) : instructors.length > 0 ? (
                            instructors.map((inst) => (
                                <MenuItem key={inst.instructorid} value={inst.instructorid}>
                                    {`${inst.lastname}, ${inst.firstname}`}
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled value="">No instructors found</MenuItem>
                        )}
                    </Select>
                </FormControl>
                
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="Scheduled Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    disabled={isScheduling}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isScheduling}>Cancel</Button>
                <Button 
                    onClick={handleSchedule} 
                    variant="contained" 
                    disabled={isScheduling || isLoadingInstructors || !selectedInstructorId || !scheduledDate}
                >
                    {isScheduling ? <CircularProgress size={24} /> : 'Confirm Schedule'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ScheduleCourseDialog; 