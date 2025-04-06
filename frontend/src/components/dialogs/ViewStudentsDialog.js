import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    List,
    ListItem,
    ListItemText,
    Typography,
    CircularProgress,
    Alert,
    Divider
} from '@mui/material';
import * as api from '../../services/api';

const ViewStudentsDialog = ({ open, onClose, courseId }) => {
    // Log the props received
    console.log('[ViewStudentsDialog] Rendering with props:', { open, courseId });

    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch students when the dialog opens and courseId is valid
        if (open && courseId) {
            const fetchStudents = async () => {
                setIsLoading(true);
                setError('');
                try {
                    const fetchedStudents = await api.getStudentsForCourse(courseId);
                    setStudents(fetchedStudents || []);
                } catch (err) {
                    setError(err.message || 'Failed to load students.');
                    setStudents([]);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStudents();
        } else {
            // Reset state if dialog closes or courseId is invalid
            setStudents([]);
            setError('');
            setIsLoading(false);
        }
    }, [open, courseId]); // Re-run effect if open or courseId changes

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Registered Students (Course ID: {courseId})</DialogTitle>
            <DialogContent dividers>
                {isLoading && <CircularProgress />}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {!isLoading && !error && (
                    <List dense>
                        {students.length > 0 ? (
                            students.map((student) => (
                                <React.Fragment key={student.studentid}>
                                    <ListItem>
                                        <ListItemText 
                                            primary={`${student.lastname}, ${student.firstname}`} 
                                            secondary={student.email || 'No email provided'}
                                        />
                                         {/* Display Attendance Status */}
                                         <Typography variant="caption" sx={{ ml: 2, color: student.attendance ? 'success.main' : 'text.disabled' }}>
                                            {student.attendance ? 'Present' : 'Absent'}
                                        </Typography>
                                    </ListItem>
                                    <Divider component="li" />
                                </React.Fragment>
                            ))
                        ) : (
                            <Typography variant="body2">No students are currently registered for this course.</Typography>
                        )}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ViewStudentsDialog; 