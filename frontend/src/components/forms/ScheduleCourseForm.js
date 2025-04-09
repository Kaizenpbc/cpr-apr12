import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, CircularProgress, Typography, Alert, Grid } from '@mui/material';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const ScheduleCourseForm = ({ onCourseScheduled }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        dateRequested: '',
        location: '',
        courseTypeId: '',
        registeredStudents: '',
        notes: '',
    });
    const [courseTypes, setCourseTypes] = useState([]);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Fetch course types when component mounts
        const fetchTypes = async () => {
            setIsLoadingTypes(true);
            try {
                const types = await api.getCourseTypes();
                setCourseTypes(types);
            } catch (err) {
                setError('Failed to load course types. ' + (err.message || ''));
            } finally {
                setIsLoadingTypes(false);
            }
        };
        fetchTypes();
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        // Basic numeric validation for registeredStudents
        if (name === 'registeredStudents' && value && !/^[0-9]*$/.test(value)) {
            return; 
        }
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
        // Clear messages on change
        setError('');
        setSuccessMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsSubmitting(true);
        console.log('[handleSubmit] Form submitted with data:', formData);

        // Basic validation
        if (!formData.dateRequested || !formData.location || !formData.courseTypeId || formData.registeredStudents === '') {
            setError('Please fill in all required fields (Date, Location, Course Type, # Students).');
            setIsSubmitting(false);
            return;
        }

        try {
            const dataToSend = {
                ...formData,
                registeredStudents: parseInt(formData.registeredStudents, 10) || 0, // Ensure number
            };
            console.log('[handleSubmit] Calling api.requestCourse with:', dataToSend);
            const response = await api.requestCourse(dataToSend);
            console.log('[handleSubmit] API response received:', response);

            if (response.success) {
                const message = response.message || 'Course requested successfully!';
                console.log('[handleSubmit] Success! Setting success message:', message);
                setSuccessMessage(message);
                // Clear form
                setFormData({
                    dateRequested: '',
                    location: '',
                    courseTypeId: '',
                    registeredStudents: '',
                    notes: '',
                });
                // Optionally call a parent handler
                if (onCourseScheduled) {
                    onCourseScheduled(response.course);
                }
            } else {
                 const errorMessage = response.message || 'Failed to schedule course.';
                 console.log('[handleSubmit] API reported failure. Setting error:', errorMessage);
                 setError(errorMessage);
            }
        } catch (err) {
            const errorMessage = err.message || 'Failed to submit request.';
            console.error('[handleSubmit] Exception caught. Setting error:', errorMessage, err);
            setError('Failed to submit request. ' + errorMessage);
        } finally {
            console.log('[handleSubmit] Setting isSubmitting to false.');
            setIsSubmitting(false);
        }
    };

    // Render loading state if user or organization name is not yet available
    // <<< DETAILED LOGGING START >>>
    console.log('[ScheduleCourseForm] Checking user object before rendering:', user);
    // <<< DETAILED LOGGING END >>>
    if (!user || !user.organizationName) {
        // <<< DETAILED LOGGING START >>>
        console.log(`[ScheduleCourseForm] Condition failed: !user is ${!user}, !user.organizationName is ${!user?.organizationName}. Showing loading spinner.`);
        // <<< DETAILED LOGGING END >>>
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                <CircularProgress size={24} sx={{ mr: 1 }} />
                <Typography>Loading organization info...</Typography>
            </Box>
        );
    }

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <Typography variant="body1" gutterBottom>
                Please provide the details for the course you wish to schedule.
            </Typography>
            
            {/* Log when attempting to render error alert */}
            {error && console.log('[Render] Attempting to render Error Alert')}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            {/* Log when attempting to render success alert */}
            {successMessage && console.log('[Render] Attempting to render Success Alert with message:', successMessage)}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            <Grid container spacing={2}>
                <Grid xs={12}>
                    <TextField 
                        label="Organization"
                        value={user.organizationName}
                        fullWidth 
                        disabled
                        margin="normal"
                    />
                </Grid>
                <Grid xs={12} md={6}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="dateRequested"
                        label="Date Requested"
                        name="dateRequested"
                        type="date" // Use date input type
                        InputLabelProps={{
                            shrink: true,
                        }}
                        value={formData.dateRequested}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </Grid>
                <Grid xs={12} md={6}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="location"
                        label="Location (e.g., Address or Room)"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        disabled={isSubmitting}
                    />
                </Grid>
                <Grid xs={12} md={6}>
                    <FormControl fullWidth margin="normal" required disabled={isLoadingTypes || isSubmitting}>
                        <InputLabel id="courseTypeId-label">Type of Course</InputLabel>
                        <Select
                            labelId="courseTypeId-label"
                            id="courseTypeId"
                            value={formData.courseTypeId}
                            label="Type of Course"
                            name="courseTypeId"
                            onChange={handleChange}
                        >
                            {isLoadingTypes ? (
                                <MenuItem disabled value="">
                                    <CircularProgress size={20} sx={{ mr: 1 }}/> Loading Types...
                                </MenuItem>
                            ) : courseTypes.length > 0 ? (
                                courseTypes.map((type) => (
                                    <MenuItem key={type.coursetypeid} value={type.coursetypeid}>
                                        {type.coursetypename}
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem disabled value="">
                                    No course types available
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid xs={12} md={6}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="registeredStudents"
                        label="# of Students Registered"
                        name="registeredStudents"
                        type="number"
                        value={formData.registeredStudents}
                        onChange={handleChange}
                        InputProps={{ inputProps: { min: 0 } }} 
                        disabled={isSubmitting}
                    />
                </Grid>
                <Grid xs={12}>
                    <TextField
                        margin="normal"
                        fullWidth
                        id="notes"
                        label="Notes (Optional, max 50 chars)"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        multiline
                        rows={2} // Adjust rows as needed
                        inputProps={{ maxLength: 50 }} 
                        disabled={isSubmitting}
                    />
                </Grid>
            </Grid>
            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isSubmitting || isLoadingTypes}
            >
                {isSubmitting ? <CircularProgress size={24} /> : 'Request Course Schedule'}
            </Button>
        </Box>
    );
};

export default ScheduleCourseForm; 