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
    Snackbar,
    Select, MenuItem, FormControl, InputLabel,
    TextField,
    Button,
    TableSortLabel
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
import ScheduleCourseDialog from '../dialogs/ScheduleCourseDialog';

const drawerWidth = 240;

const CourseAdminPortal = () => {
    const { user, logout, socket } = useAuth();
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
    const [showScheduleDialog, setShowScheduleDialog] = useState(false);
    const [selectedCourseForSchedule, setSelectedCourseForSchedule] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [allInstructors, setAllInstructors] = useState([]);
    const [selectedInstructorFilter, setSelectedInstructorFilter] = useState('');
    const [selectedDateFilter, setSelectedDateFilter] = useState('');
    const [pendingDateFilter, setPendingDateFilter] = useState('');
    const [scheduledInstructorFilter, setScheduledInstructorFilter] = useState('');
    const [scheduledDateFilter, setScheduledDateFilter] = useState('');
    const [instructorSortOrder, setInstructorSortOrder] = useState('asc');
    const [instructorSortBy, setInstructorSortBy] = useState('date');
    const [completedSortOrder, setCompletedSortOrder] = useState('desc');
    const [completedSortBy, setCompletedSortBy] = useState('date');

    // --- Define showSnackbar helper ---
    const showSnackbar = useCallback((message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    }, []); // Depends only on stable setter

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

    const loadAllInstructors = useCallback(async () => {
        try {
            const data = await api.getAllInstructors();
            setAllInstructors(data || []);
        } catch (err) {
            console.error('Error loading instructors for filter:', err);
            setAllInstructors([]);
        }
    }, []);

    useEffect(() => {
        loadAllInstructors();
    }, [loadAllInstructors]);

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
    }, [selectedView, loadInstructorData, loadPendingCourses, loadScheduledCourses, loadCompletedCourses, loadAllInstructors]);

    useEffect(() => {
        if (!socket) return; // Don't run if socket isn't ready

        console.log('[AdminPortal] Setting up socket listener for attendance_updated');
        
        const handleAttendanceUpdate = ({ courseId, newAttendanceCount }) => {
            console.log(`[handleAttendanceUpdate] Event received. CourseID: ${courseId} (Type: ${typeof courseId}), New Count: ${newAttendanceCount} (Type: ${typeof newAttendanceCount}). Updating state...`);
            
            // Update state for all relevant course lists using the correct lowercase key 'studentsattendance'
            let nextScheduledCoursesState;
            setScheduledCourses(prev => {
                console.log('[setScheduledCourses updater] Value of prev state:', prev);
                nextScheduledCoursesState = prev.map(course => 
                   course.courseid === courseId ? { ...course, studentsattendance: newAttendanceCount } : course
                );
                console.log('[handleAttendanceUpdate] Calculated next scheduledCourses state:', nextScheduledCoursesState);
                return nextScheduledCoursesState; 
            });

            setInstructorData(prev => prev.map(item => 
                item.id === `course-${courseId}` ? { ...item, studentsattendance: newAttendanceCount } : item
            ));
            setCompletedCourses(prev => prev.map(course => 
                course.courseid === courseId ? { ...course, studentsattendance: newAttendanceCount } : course
            ));
            // No need to update pending courses as they shouldn't have attendance yet

            showSnackbar(`Attendance updated for course ${courseId}`, 'info');
        };

        socket.on('attendance_updated', handleAttendanceUpdate);

        // Cleanup listener
        return () => {
            console.log('[AdminPortal] Cleaning up socket listener for attendance_updated');
            socket.off('attendance_updated', handleAttendanceUpdate);
        };

    }, [socket, showSnackbar]);

    const handleScheduleCourseClick = (course) => {
        console.log("Schedule course clicked:", course);
        setSelectedCourseForSchedule(course);
        setShowScheduleDialog(true);
    };

    const handleScheduleDialogClose = () => {
        setShowScheduleDialog(false);
        setSelectedCourseForSchedule(null);
    };

    const handleCourseSuccessfullyScheduled = (updatedCourse) => {
        console.log("Course scheduled successfully in portal:", updatedCourse);
        setSnackbar({ open: true, message: 'Course scheduled successfully!', severity: 'success' });
        loadPendingCourses();
        loadScheduledCourses();
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

    const handleBillClick = async (courseId) => {
        console.log("Marking course ready for billing:", courseId);
        // Consider adding a confirmation dialog here?
        try {
            const response = await api.markCourseReadyForBilling(courseId);
            if (response.success) {
                setSnackbar({ open: true, message: response.message || 'Course marked ready for billing!', severity: 'success' });
                // Refresh the completed courses list (the course should disappear)
                loadCompletedCourses(); 
            } else {
                setSnackbar({ open: true, message: response.message || 'Failed to mark course.', severity: 'error' });
            }
        } catch (err) {
            console.error("Error marking course for billing:", err);
            setSnackbar({ open: true, message: err.message || 'An error occurred.', severity: 'error' });
        }
    };

    const handleCancelCourse = async (courseId, courseNumber) => {
        const confirmMessage = `Are you sure you want to cancel course: ${courseNumber} (ID: ${courseId})?`;
        if (window.confirm(confirmMessage)) {
            console.log(`Attempting to cancel course ${courseId}`);
            try {
                const response = await api.cancelCourse(courseId);
                if (response.success) {
                    showSnackbar(response.message || 'Course cancelled successfully.', 'success');
                    // Refresh relevant lists
                    loadPendingCourses(); 
                    loadScheduledCourses();
                } else {
                    throw new Error(response.message || 'Cancellation failed on server.');
                }
            } catch (err) {
                console.error(`Error cancelling course ${courseId}:`, err);
                showSnackbar(err.message || 'An error occurred during cancellation.', 'error');
            }
        }
    };

    const handleInstructorFilterChange = (event) => {
        setSelectedInstructorFilter(event.target.value);
    };

    const handleDateFilterChange = (event) => {
        setSelectedDateFilter(event.target.value);
    };

    const handlePendingDateFilterChange = (event) => {
        setPendingDateFilter(event.target.value);
    };

    const handleScheduledInstructorFilterChange = (event) => {
        setScheduledInstructorFilter(event.target.value);
    };

    const handleScheduledDateFilterChange = (event) => {
        setScheduledDateFilter(event.target.value);
    };

    const handleInstructorSortRequest = (property) => {
        const isAsc = instructorSortBy === property && instructorSortOrder === 'asc';
        setInstructorSortOrder(isAsc ? 'desc' : 'asc');
        setInstructorSortBy(property);
    };

    const handleCompletedSortRequest = (property) => {
        const isAsc = completedSortBy === property && completedSortOrder === 'asc';
        setCompletedSortOrder(isAsc ? 'desc' : 'asc');
        setCompletedSortBy(property);
    };

    const renderSelectedView = () => {
        console.log(`[renderSelectedView] Rendering view: ${selectedView}`);
        switch (selectedView) {
            case 'dashboard':
                return <Typography variant="h5">Admin Dashboard (Placeholder)</Typography>;
            case 'instructors':
                const filteredInstructorData = instructorData.filter(item => {
                    const instructorMatch = !selectedInstructorFilter || item.instructorName === selectedInstructorFilter;
                    const itemDateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : null;
                    const dateMatch = !selectedDateFilter || itemDateStr === selectedDateFilter;
                    return instructorMatch && dateMatch;
                });

                filteredInstructorData.sort((a, b) => {
                    let compareA, compareB;
                    if (instructorSortBy === 'date') {
                        compareA = new Date(a.date || 0);
                        compareB = new Date(b.date || 0);
                    } else if (instructorSortBy === 'status') {
                        compareA = a.status || '';
                        compareB = b.status || '';
                    } else {
                        compareA = a.instructorName || '';
                        compareB = b.instructorName || '';
                    }
                    
                    if (compareB < compareA) {
                        return (instructorSortOrder === 'asc' ? 1 : -1);
                    }
                    if (compareB > compareA) {
                        return (instructorSortOrder === 'asc' ? -1 : 1);
                    }
                    return 0;
                });
                
                console.log(`[renderSelectedView: instructors] State: isLoading=${isLoadingInstructors}, error=${instructorsError}, ALL_DATA_LEN=${instructorData.length}, SORTED_FILTERED_DATA_LEN=${filteredInstructorData.length}`);
                
                return (
                    <>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel id="instructor-filter-label">Filter by Instructor</InputLabel>
                                <Select
                                    labelId="instructor-filter-label"
                                    value={selectedInstructorFilter}
                                    label="Filter by Instructor"
                                    onChange={handleInstructorFilterChange}
                                >
                                    <MenuItem value=""><em>All Instructors</em></MenuItem>
                                    {allInstructors.map((inst) => (
                                        <MenuItem key={inst.instructorid} value={`${inst.firstname} ${inst.lastname}`}>
                                            {`${inst.lastname}, ${inst.firstname}`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField 
                                label="Filter by Date"
                                type="date"
                                size="small"
                                value={selectedDateFilter}
                                onChange={handleDateFilterChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 180 }}
                            />
                            <Button 
                                size="small" 
                                onClick={() => {setSelectedInstructorFilter(''); setSelectedDateFilter('');}}
                                disabled={!selectedInstructorFilter && !selectedDateFilter}
                            >
                                Clear Filters
                            </Button>
                        </Box>

                        {isLoadingInstructors ? (
                            <CircularProgress />
                        ) : instructorsError ? (
                            <Alert severity="error">{instructorsError}</Alert>
                        ) : (
                            <InstructorDashboardTable 
                                data={filteredInstructorData} 
                                sortOrder={instructorSortOrder}
                                sortBy={instructorSortBy}
                                onSortRequest={handleInstructorSortRequest} 
                            />
                        )}
                    </>
                );
            case 'pending':
                // Apply date filter
                const filteredPendingCourses = pendingCourses.filter(course => {
                    // Format course DateRequested to YYYY-MM-DD for comparison
                    const courseDateStr = course.daterequested ? new Date(course.daterequested).toISOString().split('T')[0] : null;
                    return !pendingDateFilter || courseDateStr === pendingDateFilter;
                });

                console.log(`[renderSelectedView: pending] State: isLoading=${isLoadingPending}, error=${pendingError}, ALL_COURSES_LEN=${pendingCourses.length}, FILTERED_COURSES_LEN=${filteredPendingCourses.length}`);

                return (
                    <>
                        {/* Filter UI */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                            <TextField 
                                label="Filter by Date Requested"
                                type="date"
                                size="small"
                                value={pendingDateFilter}
                                onChange={handlePendingDateFilterChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 180 }}
                            />
                             <Button 
                                size="small" 
                                onClick={() => setPendingDateFilter('')}
                                disabled={!pendingDateFilter}
                            >
                                Clear Date Filter
                            </Button>
                        </Box>

                        {/* Loading / Error / Table Display */}
                        {isLoadingPending ? (
                            <CircularProgress />
                        ) : pendingError ? (
                            <Alert severity="error">{pendingError}</Alert>
                        ) : (
                            <PendingCoursesTable 
                                courses={filteredPendingCourses} 
                                onScheduleClick={handleScheduleCourseClick} 
                                onViewStudentsClick={handleViewStudentsClick}
                                onCancelClick={handleCancelCourse}
                            />
                        )}
                    </>
                );
            case 'scheduled':
                // Apply instructor and date filters
                const filteredScheduledCourses = scheduledCourses.filter(course => {
                    const instructorMatch = !scheduledInstructorFilter || course.instructorname === scheduledInstructorFilter;
                    // Format course DateScheduled to YYYY-MM-DD
                    const courseDateStr = course.datescheduled ? new Date(course.datescheduled).toISOString().split('T')[0] : null;
                    const dateMatch = !scheduledDateFilter || courseDateStr === scheduledDateFilter;
                    return instructorMatch && dateMatch;
                });

                console.log(`[renderSelectedView: scheduled] State: isLoading=${isLoadingScheduled}, error=${scheduledError}, ALL_COURSES_LEN=${scheduledCourses.length}, FILTERED_COURSES_LEN=${filteredScheduledCourses.length}`);
                
                return (
                    <>
                         {/* Filter UI - Similar to Instructor Dashboard */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel id="scheduled-instructor-filter-label">Filter by Instructor</InputLabel>
                                <Select
                                    labelId="scheduled-instructor-filter-label"
                                    value={scheduledInstructorFilter}
                                    label="Filter by Instructor"
                                    onChange={handleScheduledInstructorFilterChange}
                                >
                                    <MenuItem value=""><em>All Instructors</em></MenuItem>
                                    {allInstructors.map((inst) => (
                                        // Use full name for consistency, might need adjustment if instructorName format differs
                                        <MenuItem key={inst.instructorid} value={`${inst.firstname} ${inst.lastname}`}>
                                            {`${inst.lastname}, ${inst.firstname}`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField 
                                label="Filter by Date Scheduled"
                                type="date"
                                size="small"
                                value={scheduledDateFilter}
                                onChange={handleScheduledDateFilterChange}
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 180 }}
                            />
                             <Button 
                                size="small" 
                                onClick={() => {setScheduledInstructorFilter(''); setScheduledDateFilter('');}}
                                disabled={!scheduledInstructorFilter && !scheduledDateFilter}
                            >
                                Clear Filters
                            </Button>
                        </Box>

                        {/* Loading / Error / Table Display */}
                        {isLoadingScheduled ? (
                            <CircularProgress />
                        ) : scheduledError ? (
                            <Alert severity="error">{scheduledError}</Alert>
                        ) : (
                            <ScheduledCoursesTable 
                                courses={filteredScheduledCourses} 
                                onViewStudentsClick={handleViewStudentsClick} 
                                onCancelClick={handleCancelCourse}
                            />
                        )}
                    </>
                );
            case 'completed':
                // Apply sorting
                const sortedCompletedCourses = [...completedCourses].sort((a, b) => {
                    let compareA, compareB;
                    if (completedSortBy === 'date') {
                        // Assuming datescheduled is the completion date for now
                        compareA = new Date(a.datescheduled || 0); 
                        compareB = new Date(b.datescheduled || 0);
                    } else if (completedSortBy === 'organization') {
                        compareA = a.organizationname || '';
                        compareB = b.organizationname || '';
                    } else { // instructorName
                        compareA = a.instructorname || '';
                        compareB = b.instructorname || '';
                    }
                    
                    if (compareB < compareA) {
                        return (completedSortOrder === 'asc' ? 1 : -1);
                    }
                    if (compareB > compareA) {
                        return (completedSortOrder === 'asc' ? -1 : 1);
                    }
                    return 0;
                });

                console.log(`[renderSelectedView: completed] State: isLoading=${isLoadingCompleted}, error=${completedError}, SORTED_COURSES_LEN=${sortedCompletedCourses.length}`);
                if (isLoadingCompleted) {
                    return <CircularProgress />;
                }
                if (completedError) {
                    return <Alert severity="error">{completedError}</Alert>;
                }
                return (
                    <CompletedCoursesTable 
                        courses={sortedCompletedCourses}
                        onViewStudentsClick={handleViewStudentsClick}
                        onBillClick={handleBillClick}
                        sortOrder={completedSortOrder}
                        sortBy={completedSortBy}
                        onSortRequest={handleCompletedSortRequest}
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

            {showScheduleDialog && (
                <ScheduleCourseDialog
                    open={showScheduleDialog}
                    onClose={handleScheduleDialogClose}
                    course={selectedCourseForSchedule}
                    onCourseScheduled={handleCourseSuccessfullyScheduled}
                />
            )}

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

export default CourseAdminPortal; 