import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
    // Add other MUI components as needed
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon, // For Instructor Dashboard
    PendingActions as PendingActionsIcon, // For Pending Courses
    EventAvailable as EventAvailableIcon, // For Scheduled Courses
    Logout as LogoutIcon,
    CheckCircle as CompletedIcon, // Icon for Completed
} from '@mui/icons-material';
import * as api from '../../services/api';
import InstructorDashboardTable from '../tables/InstructorDashboardTable';
import PendingCoursesTable from '../tables/PendingCoursesTable';
import ScheduledCoursesTable from '../tables/ScheduledCoursesTable';
import CompletedCoursesTable from '../tables/CompletedCoursesTable';
import ViewStudentsDialog from '../dialogs/ViewStudentsDialog';

const drawerWidth = 240;

const CourseAdminPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState('instructors');
    const [instructorData, setInstructorData] = useState([]);
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);
    const [instructorsError, setInstructorsError] = useState('');
    const [pendingCourses, setPendingCourses] = useState([]);
    const [isLoadingPending, setIsLoadingPending] = useState(false);
    const [pendingError, setPendingError] = useState('');
    const [scheduledCourses, setScheduledCourses] = useState([]);
    const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
    const [scheduledError, setScheduledError] = useState('');
    const [completedCourses, setCompletedCourses] = useState([]);
    const [isLoadingCompleted, setIsLoadingCompleted] = useState(false);
    const [completedError, setCompletedError] = useState('');
    const [showViewStudentsDialog, setShowViewStudentsDialog] = useState(false);
    const [selectedCourseForView, setSelectedCourseForView] = useState(null);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const loadInstructorData = useCallback(async () => {
        setIsLoadingInstructors(true);
        setInstructorsError('');
        console.log('[loadInstructorData] Fetching...'); // Log start
        try {
            const data = await api.getInstructorDashboard();
            console.log('[loadInstructorData] API Response:', data);
            setInstructorData(data);
            console.log('[loadInstructorData] State updated:', data);
        } catch (err) {
            console.error('Error loading instructor dashboard:', err);
            const errorMsg = err.message || 'Failed to load instructor data.';
            setInstructorsError(errorMsg);
            console.log('[loadInstructorData] Error state set:', errorMsg);
            setInstructorData([]);
        } finally {
            setIsLoadingInstructors(false);
            console.log('[loadInstructorData] Finished.');
        }
    }, []);

    const loadPendingCourses = useCallback(async () => {
        setIsLoadingPending(true);
        setPendingError('');
        console.log('[loadPendingCourses] Fetching...'); // Log start
        try {
            const data = await api.getPendingCourses();
            console.log('[loadPendingCourses] API Response:', data);
            setPendingCourses(data);
            console.log('[loadPendingCourses] State updated:', data);
        } catch (err) {
            console.error('Error loading pending courses:', err);
            const errorMsg = err.message || 'Failed to load pending courses.';
            setPendingError(errorMsg);
            console.log('[loadPendingCourses] Error state set:', errorMsg);
            setPendingCourses([]);
        } finally {
            setIsLoadingPending(false);
            console.log('[loadPendingCourses] Finished.');
        }
    }, []);

    const loadScheduledCourses = useCallback(async () => {
        setIsLoadingScheduled(true);
        setScheduledError('');
        console.log('[loadScheduledCourses] Fetching...'); // Log start
        try {
            const data = await api.getScheduledCoursesAdmin();
            console.log('[loadScheduledCourses] API Response:', data);
            setScheduledCourses(data || []); // Ensure it's an array
            console.log('[loadScheduledCourses] State updated:', data || []);
        } catch (err) {
            console.error('Error loading scheduled courses:', err);
            const errorMsg = err.message || 'Failed to load scheduled courses.';
            setScheduledError(errorMsg);
            console.log('[loadScheduledCourses] Error state set:', errorMsg);
            setScheduledCourses([]);
        } finally {
            setIsLoadingScheduled(false);
            console.log('[loadScheduledCourses] Finished.');
        }
    }, []);

    const loadCompletedCourses = useCallback(async () => {
        setIsLoadingCompleted(true);
        setCompletedError('');
        console.log('[loadCompletedCourses] Fetching...'); // Log start
        try {
            const data = await api.getCompletedCoursesAdmin();
            console.log('[loadCompletedCourses] API Response:', data);
            setCompletedCourses(data || []); // Ensure it's an array
            console.log('[loadCompletedCourses] State updated:', data || []);
        } catch (err) {
            console.error('Error loading completed courses:', err);
            const errorMsg = err.message || 'Failed to load completed courses.';
            setCompletedError(errorMsg);
            console.log('[loadCompletedCourses] Error state set:', errorMsg);
            setCompletedCourses([]);
        } finally {
            setIsLoadingCompleted(false);
            console.log('[loadCompletedCourses] Finished.');
        }
    }, []);

    useEffect(() => {
        if (selectedView === 'instructors') {
            console.log('[useEffect] Loading instructor data...');
            loadInstructorData();
        } else if (selectedView === 'pending') {
            console.log('[useEffect] Loading pending courses...');
            loadPendingCourses();
        } else if (selectedView === 'scheduled') {
            console.log('[useEffect] Loading scheduled courses...');
            loadScheduledCourses();
        } else if (selectedView === 'completed') {
            console.log('[useEffect] Loading completed courses...');
            loadCompletedCourses();
        }
    }, [selectedView, loadInstructorData, loadPendingCourses, loadScheduledCourses, loadCompletedCourses]);

    const handleScheduleCourseClick = (course) => {
        console.log("Schedule course clicked:", course);
        alert("Schedule functionality not yet implemented.");
    };

    const handleViewStudentsClick = (courseId) => {
        console.log("[AdminPortal] handleViewStudentsClick CALLED with courseId:", courseId);
        setSelectedCourseForView(courseId);
        setShowViewStudentsDialog(true);
    };

    const handleViewStudentsDialogClose = () => {
        setShowViewStudentsDialog(false);
        setSelectedCourseForView(null);
    };

    const handleBillClick = (courseId) => {
        console.log("Bill course clicked:", courseId);
        alert("Billing functionality not yet implemented.");
    };

    const renderSelectedView = () => {
        console.log(`[renderSelectedView] Rendering view: ${selectedView}`); // Log which view is rendering
        switch (selectedView) {
            case 'dashboard':
                return <Typography variant="h5">Admin Dashboard (Placeholder)</Typography>;
            case 'instructors':
                if (isLoadingInstructors) {
                    return <CircularProgress />;
                }
                if (instructorsError) {
                    return <Alert severity="error">{instructorsError}</Alert>;
                }
                return <InstructorDashboardTable data={instructorData} />;
            case 'pending':
                if (isLoadingPending) {
                    return <CircularProgress />;
                }
                if (pendingError) {
                    return <Alert severity="error">{pendingError}</Alert>;
                }
                return (
                    <PendingCoursesTable 
                        courses={pendingCourses} 
                        onScheduleClick={handleScheduleCourseClick} 
                        onViewStudentsClick={handleViewStudentsClick}
                    />
                );
            case 'scheduled':
                console.log(`[renderSelectedView: scheduled] State: isLoading=${isLoadingScheduled}, error=${scheduledError}, courses=${JSON.stringify(scheduledCourses)}`);
                if (isLoadingScheduled) {
                    return <CircularProgress />;
                }
                if (scheduledError) {
                    return <Alert severity="error">{scheduledError}</Alert>;
                }
                return (
                    <ScheduledCoursesTable 
                        courses={scheduledCourses} 
                        onViewStudentsClick={handleViewStudentsClick}
                    />
                );
            case 'completed':
                console.log(`[renderSelectedView: completed] State: isLoading=${isLoadingCompleted}, error=${completedError}, courses=${JSON.stringify(completedCourses)}`);
                if (isLoadingCompleted) {
                    return <CircularProgress />;
                }
                if (completedError) {
                    return <Alert severity="error">{completedError}</Alert>;
                }
                return (
                    <CompletedCoursesTable 
                        courses={completedCourses} 
                        onViewStudentsClick={handleViewStudentsClick}
                        onBillClick={handleBillClick} 
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
                <Box sx={{ overflow: 'auto', mt: 8 }}> {/* Adjust mt if header height changes */}
                    <List>
                        {/* Dashboard Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'dashboard'}
                            onClick={() => setSelectedView('dashboard')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <DashboardIcon />
                            </ListItemIcon>
                            <ListItemText primary="Dashboard" />
                        </ListItem>

                        {/* Instructor Dashboard Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'instructors'}
                            onClick={() => setSelectedView('instructors')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <PeopleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Instructor Dashboard" />
                        </ListItem>

                         {/* Pending Courses Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'pending'}
                            onClick={() => setSelectedView('pending')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <PendingActionsIcon />
                            </ListItemIcon>
                            <ListItemText primary="Pending Courses" />
                        </ListItem>

                        {/* Scheduled Courses Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'scheduled'}
                            onClick={() => setSelectedView('scheduled')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <EventAvailableIcon />
                            </ListItemIcon>
                            <ListItemText primary="Scheduled Courses" />
                        </ListItem>

                        {/* Completed Courses Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'completed'}
                            onClick={() => setSelectedView('completed')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <CompletedIcon />
                            </ListItemIcon>
                            <ListItemText primary="Completed Courses" />
                        </ListItem>
                        
                        <Divider sx={{ my: 1 }} />

                        {/* Logout Item */}
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

            <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}> {/* Adjust mt to clear potential app bar */}
                <Container maxWidth="lg">
                    <Typography variant="h4" gutterBottom>
                        Welcome, {user?.FirstName || 'Admin User'} {/* Use optional chaining */}
                    </Typography>
                    
                    {/* Render the selected view based on state */}
                    {renderSelectedView()}
                </Container>
            </Box>

            {showViewStudentsDialog && (
                <ViewStudentsDialog
                    open={showViewStudentsDialog}
                    onClose={handleViewStudentsDialogClose}
                    courseId={selectedCourseForView}
                />
            )}
        </Box>
    );
};

export default CourseAdminPortal; 