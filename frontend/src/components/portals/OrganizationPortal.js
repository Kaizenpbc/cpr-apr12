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
} from '@mui/material';
import {
    EditCalendar as ScheduleIcon,
    ListAlt as ListIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import ScheduleCourseForm from '../forms/ScheduleCourseForm';
import OrganizationCoursesTable from '../tables/OrganizationCoursesTable';
import StudentUploadDialog from '../dialogs/StudentUploadDialog';
import ViewStudentsDialog from '../dialogs/ViewStudentsDialog';

const drawerWidth = 240;

const OrganizationPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState('myCourses');
    const [organizationCourses, setOrganizationCourses] = useState([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [coursesError, setCoursesError] = useState('');
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [selectedCourseForUpload, setSelectedCourseForUpload] = useState(null);
    const [showViewStudentsDialog, setShowViewStudentsDialog] = useState(false);
    const [selectedCourseForView, setSelectedCourseForView] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const loadOrgCourses = useCallback(async () => {
        if (!user?.organizationId) {
            setCoursesError('Organization ID not found for user.');
            console.error("Cannot load courses: Organization ID missing in user context.");
            return;
        }
        setIsLoadingCourses(true);
        setCoursesError('');
        try {
            const response = await api.getOrganizationCourses(user.organizationId);
            if (response.success) {
                setOrganizationCourses(response.courses || []);
            } else {
                throw new Error(response.message || 'Failed to load courses');
            }
        } catch (err) {
            console.error('Error loading organization courses:', err);
            setCoursesError(err.message || 'Failed to load courses.');
            setOrganizationCourses([]);
        } finally {
            setIsLoadingCourses(false);
        }
    }, [user?.organizationId]);

    useEffect(() => {
        if (selectedView === 'myCourses') {
            loadOrgCourses();
        }
    }, [selectedView, loadOrgCourses]);

    const handleCourseScheduled = (newCourse) => {
        // Add the new course to the beginning of the list for immediate feedback
        // Note: This might not be necessary if the user stays on the form page
        // setOrganizationCourses(prevCourses => [newCourse, ...prevCourses]);
        
        // Comment out the view switch to stay on the form
        // setSelectedView('myCourses'); 
        
        console.log('Course scheduled (in parent portal):', newCourse);
        // If My Courses data is loaded, we might want to trigger a refresh for next time
        // loadOrgCourses(); // Consider if this should be called or handled differently
    };

    // --- Action Handlers for Table ---
    const handleUploadStudentsClick = (courseId) => {
        console.log("Upload students clicked for course:", courseId);
        setSelectedCourseForUpload(courseId); // Store the course ID
        setShowUploadDialog(true); // Open the dialog
    };

    const handleViewStudentsClick = (courseId) => {
        console.log("[OrgPortal] handleViewStudentsClick CALLED with courseId:", courseId);
        setSelectedCourseForView(courseId);
        setShowViewStudentsDialog(true);
    };
    
    const handleUploadDialogClose = () => {
        setShowUploadDialog(false);
        setSelectedCourseForUpload(null);
    };

    const handleViewStudentsDialogClose = () => {
        setShowViewStudentsDialog(false);
        setSelectedCourseForView(null);
    };

    const handleUploadComplete = (message) => {
        // Show success message from the upload dialog
        setSnackbar({ open: true, message: message, severity: 'success' });
        // Refresh the courses list to show updated student count
        loadOrgCourses(); 
    };
    // --- End Action Handlers ---

    const renderSelectedView = () => {
        switch (selectedView) {
            case 'schedule':
                return <ScheduleCourseForm onCourseScheduled={handleCourseScheduled} />;
            case 'myCourses':
                if (isLoadingCourses) {
                    return <CircularProgress />;
                }
                if (coursesError) {
                    return <Alert severity="error">{coursesError}</Alert>;
                }
                return (
                    <OrganizationCoursesTable 
                        courses={organizationCourses} 
                        onUploadStudentsClick={handleUploadStudentsClick} 
                        onViewStudentsClick={handleViewStudentsClick}
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
                    },
                }}
            >
                <Box sx={{ overflow: 'auto', mt: 8 }}>
                    <List>
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'schedule'}
                            onClick={() => setSelectedView('schedule')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <ScheduleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Schedule a Course" />
                        </ListItem>
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'myCourses'}
                            onClick={() => setSelectedView('myCourses')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <ListIcon />
                            </ListItemIcon>
                            <ListItemText primary="My Courses" />
                        </ListItem>
                        
                        <Divider sx={{ my: 1 }} />

                        <ListItem 
                            component="div" 
                            onClick={handleLogout}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <LogoutIcon />
                            </ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
                <Container maxWidth="lg">
                    <Typography variant="h4" gutterBottom>
                        Welcome, {user?.FirstName || 'Organization User'}
                    </Typography>
                    
                    {renderSelectedView()}
                </Container>
            </Box>

            {/* Render the Upload Dialog */}
            {showUploadDialog && (
                <StudentUploadDialog
                    open={showUploadDialog}
                    onClose={handleUploadDialogClose}
                    courseId={selectedCourseForUpload}
                    onUploadComplete={handleUploadComplete}
                />
            )}
            
            {/* View Students Dialog */}
            {showViewStudentsDialog && (
                <ViewStudentsDialog
                    open={showViewStudentsDialog}
                    onClose={handleViewStudentsDialogClose}
                    courseId={selectedCourseForView}
                />
            )}
            
            {/* Snackbar for upload success message */}
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

        </Box>
    );
};

export default OrganizationPortal; 