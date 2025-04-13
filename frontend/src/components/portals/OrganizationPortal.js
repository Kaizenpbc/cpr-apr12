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
    AppBar,
    Toolbar
} from '@mui/material';
import {
    EditCalendar as ScheduleIcon,
    ListAlt as ListIcon,
    Logout as LogoutIcon,
    VpnKey as PasswordIcon,
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
    // --- Add Sorting State for Org Courses ---
    const [orgCoursesSortOrder, setOrgCoursesSortOrder] = useState('asc'); // Default to asc as per backend
    const [orgCoursesSortBy, setOrgCoursesSortBy] = useState('daterequested'); // Default sort by requested date
    // --- End Sorting State ---

    // Add showSnackbar helper (needed for logout message)
    const showSnackbar = useCallback((message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleLogout = () => {
        // Construct the message before logging out
        const firstName = user?.FirstName || 'Org User'; // Use FirstName from user object
        const logoutMessage = `Good Bye ${firstName}, Have a Pleasant Day!`;
        showSnackbar(logoutMessage, 'info'); // Show the message
        
        // Delay logout slightly
        setTimeout(() => {
            logout();
            navigate('/');
        }, 1500); 
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

    // --- Sorting Handler for Org Courses ---
    const handleOrgCoursesSortRequest = (property) => {
        // Only supporting 'daterequested' for now
        if (property === 'daterequested') { 
            const isAsc = orgCoursesSortBy === property && orgCoursesSortOrder === 'asc';
            setOrgCoursesSortOrder(isAsc ? 'desc' : 'asc');
            setOrgCoursesSortBy(property);
            // Re-fetch data with new sort order? No, backend handles initial sort.
            // We will sort the currently loaded data on the frontend.
        }
    };
    // --- End Sorting Handler ---

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

                // Apply sorting to the fetched data
                const sortedOrgCourses = [...organizationCourses].sort((a, b) => {
                    let compareA, compareB;
                    // Currently only sorting by daterequested
                    compareA = new Date(a.daterequested || 0); 
                    compareB = new Date(b.daterequested || 0);
                    
                    if (compareB < compareA) {
                        return (orgCoursesSortOrder === 'asc' ? 1 : -1);
                    }
                    if (compareB > compareA) {
                        return (orgCoursesSortOrder === 'asc' ? -1 : 1);
                    }
                    return 0;
                });

                return (
                    <OrganizationCoursesTable 
                        courses={sortedOrgCourses} // Pass sorted data
                        onUploadStudentsClick={handleUploadStudentsClick} 
                        onViewStudentsClick={handleViewStudentsClick}
                        // Pass sorting props
                        sortOrder={orgCoursesSortOrder}
                        sortBy={orgCoursesSortBy}
                        onSortRequest={handleOrgCoursesSortRequest}
                    />
                );
            default:
                return <Typography>Select a view</Typography>;
        }
    };

    return (
        <Box sx={{ display: 'flex' }}>
            {/* --- AppBar --- */}
            <AppBar
                position="fixed"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} 
            >
                <Toolbar>
                    {/* Optional Logo */}
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
                        Organization Portal
                    </Typography>
                    <Typography variant="body1" noWrap sx={{ mr: 2 }}>
                         Welcome {user?.FirstName || 'Org User'}!
                    </Typography>
                    {/* Optional: Logout Button */}
                </Toolbar>
            </AppBar>

            {/* --- Drawer --- */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        // Removed mt: 8 (or similar) - Toolbar handles offset
                    },
                }}
            >
                 {/* Toolbar spacer */}
                 <Toolbar /> 
                 <Box sx={{ overflow: 'auto' }}>
                     <List>
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'schedule'}
                            onClick={() => setSelectedView('schedule')}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'schedule' ? 'primary.light' : 'transparent',
                                color: selectedView === 'schedule' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'schedule' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'schedule' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <ScheduleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Schedule a Course" />
                        </ListItem>
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'myCourses'}
                            onClick={() => setSelectedView('myCourses')}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'myCourses' ? 'primary.light' : 'transparent',
                                color: selectedView === 'myCourses' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'myCourses' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'myCourses' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <ListIcon />
                            </ListItemIcon>
                            <ListItemText primary="My Courses" />
                        </ListItem>
                        
                        <Divider sx={{ my: 1 }} />

                        {/* Password Reset Item */}
                        <ListItem 
                            component="div"
                            onClick={() => navigate('/reset-password')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5,
                                '&:hover': { backgroundColor: 'action.hover'} 
                            }}
                        >
                            <ListItemIcon><PasswordIcon /></ListItemIcon>
                            <ListItemText primary="Reset Password" />
                        </ListItem>

                        {/* Logout Item */}
                        <ListItem 
                            component="div" 
                            onClick={handleLogout}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                '&:hover': { backgroundColor: 'action.hover'} 
                            }}
                        >
                            <ListItemIcon>
                                <LogoutIcon />
                            </ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItem>
                     </List>
                 </Box>
            </Drawer>
            {/* --- Main Content --- */}
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                 {/* Toolbar spacer */}
                 <Toolbar />
                <Container maxWidth="lg">
                    {/* Remove original welcome message */}
                    {/* 
                    <Typography variant="h4" gutterBottom>
                        Welcome, {user?.FirstName || 'Organization User'}
                    </Typography> 
                    */}
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
            
            {/* Snackbar for messages */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                // Change anchorOrigin for top-center position
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }} 
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