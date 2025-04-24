import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import {
    Box,
    Container,
    Typography,
    Paper,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Snackbar,
    AppBar,
    Toolbar,
    Divider,
    Alert,
    CircularProgress,
    Grid,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    Class as ClassIcon,
    AssignmentTurnedIn as AttendanceIcon,
    Archive as ArchiveIcon,
    Dashboard as DashboardIcon,
    Person as StudentIcon,
    Event as CourseIcon,
    Logout as LogoutIcon,
    VpnKey as PasswordIcon,
} from '@mui/icons-material';
import { formatDate, formatDisplayDate } from '../../utils/formatters';
import ConfirmDialog from '../dialogs/ConfirmDialog';

// Import the missing components
const InstructorDashboard = lazy(() => import('../views/InstructorDashboard'));
const AvailabilityView = lazy(() => import('../views/AvailabilityView'));
const MyClassesView = lazy(() => import('../views/instructor/MyClassesView'));
const AttendanceView = lazy(() => import('../views/AttendanceView'));
const InstructorArchiveTable = lazy(() => import('../tables/InstructorArchiveTable'));

const drawerWidth = 240;

// Define Ontario 2024 Statutory Holidays (YYYY-MM-DD format)
const ontarioHolidays2024 = new Set([
    '2024-01-01', // New Year's Day
    '2024-02-19', // Family Day
    '2024-03-29', // Good Friday
    '2024-05-20', // Victoria Day
    '2024-07-01', // Canada Day
    '2024-08-05', // Civic Holiday (Not statutory, but often observed)
    '2024-09-02', // Labour Day
    '2024-09-30', // National Day for Truth and Reconciliation (Federal, not Prov. stat but important)
    '2024-10-14', // Thanksgiving Day
    '2024-12-25', // Christmas Day
    '2024-12-26', // Boxing Day
]);
// Note: Easter Sunday (Mar 31) & Remembrance Day (Nov 11) are not statutory holidays in ON.

const InstructorPortal = () => {
    const { user, logout, socket } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState(() => {
        return localStorage.getItem('lastSelectedView') || 'dashboard';
    });
    const [selectedDate, setSelectedDate] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);
    const [scheduledClasses, setScheduledClasses] = useState([]);
    const [archivedCourses, setArchivedCourses] = useState([]);
    const [availableDatesResult, setAvailableDatesResult] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isLoading, setIsLoading] = useState(true);
    const [studentsForAttendance, setStudentsForAttendance] = useState([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [studentsError, setStudentsError] = useState('');
    const [classToManage, setClassToManage] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);
    const [archiveError, setArchiveError] = useState('');

    const showSnackbar = useCallback((message, severity = 'success') => {
        console.log('[showSnackbar] Setting snackbar state:', { open: true, message, severity });
        setSnackbar({ open: true, message, severity });
    }, []);

    const fetchScheduledClasses = useCallback(async () => {
        try {
            const response = await api.getInstructorSchedule();
            setScheduledClasses(response);
        } catch (error) {
            console.error('Error fetching scheduled classes:', error);
        }
    }, []);

    const fetchArchivedCourses = useCallback(async () => {
        setIsLoadingArchive(true);
        setArchiveError('');
        try {
            const response = await api.getCompletedClasses();
            if (response.success) {
                setArchivedCourses(response.courses);
            } else {
                throw new Error(response.message || 'Failed to fetch archived courses');
            }
        } catch (error) {
            console.error('Error fetching archived courses:', error);
            setArchiveError(error.message || 'Failed to fetch archived courses');
            setArchivedCourses([]);
        } finally {
            setIsLoadingArchive(false);
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        console.log('[loadInitialData] Starting...');
        try {
            // Fetch availability (now pre-filtered by backend) and scheduled classes
            const [availabilityResponse, classesResponse] = await Promise.all([
                api.getAvailability(), // Returns array of *truly* available date strings
                api.getScheduledClasses() // Returns { success: true, classes: [...] } for Status='Scheduled'
            ]);
            
            let availableDatesResult = [];
            let scheduledClassesResult = [];

            if (Array.isArray(availabilityResponse)) { 
                availableDatesResult = availabilityResponse;
            }
            if (classesResponse && Array.isArray(classesResponse.classes)) {
                scheduledClassesResult = classesResponse.classes; 
            }
            
            // Set state directly with results from API (availability is pre-filtered)
            console.log('[loadInitialData] BEFORE setAvailableDates. Raw response:', availabilityResponse);
            // Store availableDates as a Set of YYYY-MM-DD strings for efficient lookup
            const availableDatesSet = new Set();
            if (Array.isArray(availabilityResponse)) { // Check if it's an array before iterating
                availabilityResponse.forEach(dateStr => {
                    try {
                        // Assume backend sends YYYY-MM-DD or parseable string
                        availableDatesSet.add(new Date(dateStr).toISOString().split('T')[0]);
                    } catch (e) {
                        console.error(`Error parsing availability date from API: ${dateStr}`, e);
                    }
                });
            } else {
                 console.error('[loadInitialData] Availability response was not an array:', availabilityResponse);
            }
            console.log('[loadInitialData] Setting availableDates state (Set):', availableDatesSet);
            setAvailableDates(availableDatesSet); 
            console.log('[loadInitialData] AFTER setAvailableDates.');
            
            console.log('[loadInitialData] BEFORE setScheduledClasses. Data:', scheduledClassesResult);
            setScheduledClasses(scheduledClassesResult);
            console.log('[loadInitialData] AFTER setScheduledClasses.');

            console.log('[loadInitialData] State update calls finished.');
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            showSnackbar(error.message || 'Failed to load initial data.', 'error');
            setAvailableDates([]);
            setScheduledClasses([]); 
        } finally {
            setIsLoading(false);
            console.log('[loadInitialData] Finished.');
        }
    }, [showSnackbar]);

    const fetchStudentsForClass = useCallback(async (courseId) => {
        if (!courseId) return;
        setIsLoadingStudents(true);
        setStudentsError('');
        console.log(`[fetchStudentsForClass] Fetching students for course ${courseId}...`);
        try {
            const data = await api.getStudentsForCourse(courseId);
            setStudentsForAttendance(data || []);
            console.log(`[fetchStudentsForClass] State updated for course ${courseId}:`, data || []);
        } catch (err) {
            console.error(`Error loading students for course ${courseId}:`, err);
            const errorMsg = err.message || 'Failed to load students.';
            setStudentsError(errorMsg);
            showSnackbar(errorMsg, 'error');
            setStudentsForAttendance([]);
        } finally {
            setIsLoadingStudents(false);
            console.log(`[fetchStudentsForClass] Finished for course ${courseId}.`);
        }
    }, [showSnackbar]);

    useEffect(() => {
        console.log('[useEffect] Running effect, calling loadInitialData.');
        loadInitialData();

        if (socket) {
            console.log('[InstructorPortal] Setting up socket listener for course_assigned');
            
            const handleCourseAssigned = (updatedCourse) => {
                console.log('[Socket Event] course_assigned received:', updatedCourse);
                showSnackbar(`New course scheduled: ${updatedCourse.coursenumber}`, 'info');
                // Refresh the main data to update the My Classes view
                loadInitialData(); 
                // If currently on attendance view, might need to refresh that too
                if (selectedView === 'attendance') {
                     loadInitialData();
                }
            };

            socket.on('course_assigned', handleCourseAssigned);

            // Cleanup listener on component unmount or socket change
            return () => {
                console.log('[InstructorPortal] Cleaning up socket listener for course_assigned');
                socket.off('course_assigned', handleCourseAssigned);
            };
        }
    }, [loadInitialData, socket, showSnackbar, selectedView]);

    useEffect(() => {
        console.log(`[useEffect View Change] View changed to: ${selectedView}`);
        // Reset states when view changes
        setStudentsForAttendance([]);
        setClassToManage(null); 
        setStudentsError('');

        // Load data specific to the selected view
        if (selectedView === 'archive') {
            fetchArchivedCourses();
        } else if (selectedView === 'attendance') {
            if (scheduledClasses.length === 1) {
                console.log('[useEffect View Change] Auto-selecting the only scheduled class for attendance.');
                setClassToManage(scheduledClasses[0]);
            }
        }
    }, [selectedView, fetchArchivedCourses, scheduledClasses]);

    useEffect(() => {
        if (classToManage) {
            console.log(`[useEffect classToManage] Class to manage selected: ${classToManage.courseid}. Fetching students.`);
            fetchStudentsForClass(classToManage.courseid);
        } else {
            setStudentsForAttendance([]);
        }
    }, [classToManage, fetchStudentsForClass]);

    const handleDateClick = async (date) => {
        const isoDateString = date.toISOString().split('T')[0];
        console.log('[handleDateClick] Date clicked (YYYY-MM-DD):', isoDateString);
        
        console.log('[handleDateClick] Checking against availableDates Set. Contents:', availableDates);

        const isAvailable = availableDates.has(isoDateString);
        console.log('[handleDateClick] Is available in Set?', isAvailable);

        if (isAvailable) {
            setConfirmAction('remove');
            setSelectedDate(isoDateString);
            setShowConfirmDialog(true);
        } else {
            try {
                console.log('[handleDateClick] Calling api.addAvailability...');
                const response = await api.addAvailability(isoDateString);
                
                if (response.success) {
                    console.log('[handleDateClick] api.addAvailability succeeded. Refreshing data...');
                    await loadInitialData(); 
                    showSnackbar('Date marked as available');
                } else {
                    throw new Error(response.message || 'API failed to add availability');
                }
            } catch (error) {
                console.error('Error adding availability:', error);
                showSnackbar(error.message || 'Failed to add availability. Please try again.', 'error');
            }
        }
    };

    const handleManageClassClick = (classId) => {
        setClassToManage(classId);
    };

    const handleMarkCompleteClick = async (classId) => {
        console.log(`[handleMarkCompleteClick] Marking class ${classId} as complete`);
        try {
            await api.markCourseCompleted(classId);
            setSnackbar({
                open: true,
                message: 'Class marked as complete successfully',
                severity: 'success'
            });
            fetchScheduledClasses();
        } catch (error) {
            console.error('Error marking class as complete:', error);
            setSnackbar({
                open: true,
                message: 'Failed to mark class as complete',
                severity: 'error'
            });
        }
    };

    const handleAttendanceClick = (classId) => {
        console.log(`[handleAttendanceClick] Class ID: ${classId}`);
        setClassToManage(classId);
        setSelectedView('attendance');
    };

    const handleClassChange = (event) => {
        const classId = event.target.value;
        const selectedClass = scheduledClasses.find(c => c.courseid === classId);
        setClassToManage(selectedClass);
        if (selectedClass) {
            fetchStudentsForClass(selectedClass.courseid);
        }
    };

    const handleConfirmAction = async () => {
        if (!selectedDate) return;
        
        try {
            if (confirmAction === 'remove') {
                await api.removeAvailability(selectedDate);
                setAvailableDates(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedDate);
                    return newSet;
                });
                showSnackbar('Availability removed successfully');
            }
        } catch (error) {
            console.error('Error handling availability:', error);
            showSnackbar(error.message || 'Failed to update availability', 'error');
        } finally {
            setShowConfirmDialog(false);
            setSelectedDate(null);
            setConfirmAction(null);
        }
    };

    const handlePreviousMonth = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleAttendanceChange = async (studentId, currentAttendance) => {
        if (!classToManage) return;
        
        try {
            const newAttendance = !currentAttendance; // Toggle boolean value
            await api.updateStudentAttendance(studentId, newAttendance);
            
            setStudentsForAttendance(prev => 
                prev.map(student => 
                    student.studentid === studentId 
                        ? { ...student, attendance: newAttendance }
                        : student
                )
            );
            
            showSnackbar('Attendance updated successfully');
        } catch (error) {
            console.error('Error updating attendance:', error);
            showSnackbar(error.message || 'Failed to update attendance', 'error');
        }
    };

    const combinedItems = useMemo(() => {
        console.log('[useMemo] Recalculating combinedItems...');
        const classesToDisplay = Array.isArray(scheduledClasses) ? scheduledClasses : [];
        const currentAvailableDatesSet = (availableDates instanceof Set) ? availableDates : new Set(); 
        const availabilityDatesArray = Array.from(currentAvailableDatesSet);

        const combined = [
            ...classesToDisplay.map(course => {
                const scheduledIsoDate = course.datescheduled ? new Date(course.datescheduled).toISOString().split('T')[0] : null;
                return {
                    ...course,
                    type: 'class',
                    sortDate: new Date(course.datescheduled || 0), 
                    displayDate: formatDisplayDate(scheduledIsoDate),
                    key: `class-${course.courseid}`,
                    status: course.completed ? 'Completed' : 'Scheduled',
                    organizationname: course.organizationname || '-',
                    coursetypename: course.coursetypename || '-',
                    location: course.location || '-',
                    studentcount: course.studentcount || 0
                };
            }),
            ...availabilityDatesArray.map(dateString => { 
                const displayDate = formatDisplayDate(dateString);
                return {
                    type: 'availability',
                    sortDate: new Date(dateString), 
                    displayDate: displayDate,
                    dateString: dateString,
                    key: `avail-${dateString}`,
                    status: 'AVAILABLE',
                    organizationname: '-',
                    coursetypename: '-',
                    location: '-',
                    studentcount: '-'
                };
            })
        ];
        combined.sort((a, b) => a.sortDate - b.sortDate);
        return combined;
    }, [scheduledClasses, availableDates]);

    const handleViewChange = (view) => {
        setSelectedView(view);
        localStorage.setItem('lastSelectedView', view);
    };

    const renderSelectedView = () => {
        switch (selectedView) {
            case 'dashboard':
                return <InstructorDashboard />;
            case 'availability':
                return (
                    <AvailabilityView
                        availableDates={availableDates}
                        scheduledClasses={scheduledClasses}
                        ontarioHolidays2024={ontarioHolidays2024}
                        handleDateClick={handleDateClick}
                        currentDate={currentDate}
                        handlePreviousMonth={handlePreviousMonth}
                        handleNextMonth={handleNextMonth}
                    />
                );
            case 'classes':
                return (
                    <MyClassesView
                        combinedItems={combinedItems}
                        onAttendanceClick={handleAttendanceClick}
                    />
                );
            case 'attendance':
                return (
                    <AttendanceView
                        scheduledClasses={scheduledClasses}
                        classToManage={classToManage}
                        studentsForAttendance={studentsForAttendance}
                        isLoadingStudents={isLoadingStudents}
                        studentsError={studentsError}
                        handleClassChange={handleClassChange}
                        handleAttendanceChange={handleAttendanceChange}
                        handleMarkCompleteClick={handleMarkCompleteClick}
                    />
                );
            case 'archive':
                return isLoadingArchive ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : archiveError ? (
                    <Alert severity="error">{archiveError}</Alert>
                ) : (
                    <InstructorArchiveTable courses={archivedCourses} />
                );
            default:
                return <InstructorDashboard />;
        }
    };

    console.log('[InstructorPortal Render] Snackbar state:', snackbar);

    return (
        <Box sx={{ display: 'flex' }}>
            {/* --- AppBar --- */}
            <AppBar
                position="fixed"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} 
            >
                <Toolbar>
                    {/* You can add a logo here if desired */}
                    {/* <img src="/path/to/logo.svg" alt="Logo" height="40" /> */}
                    <Typography 
                        variant="h6" 
                        noWrap 
                        component="div" 
                        sx={{ 
                            flexGrow: 1, 
                            ml: 1, 
                            textAlign: 'center'
                        }}
                    >
                        Instructor Portal
                    </Typography>
                    <Typography variant="body1" noWrap sx={{ mr: 2 }}>
                        Welcome {user?.firstname || 'Instructor'}!
                    </Typography>
                    {/* Optional: Add a logout button here as well/instead */}
                    {/* <Button color="inherit" onClick={handleLogout}>Logout</Button> */}
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
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto' }}> 
                    <List>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'dashboard'}
                            onClick={() => handleViewChange('dashboard')}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'dashboard' ? 'primary.light' : 'transparent',
                                color: selectedView === 'dashboard' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'dashboard' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'dashboard' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <DashboardIcon />
                            </ListItemIcon>
                            <ListItemText primary="Dashboard" />
                        </ListItem>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'availability'}
                            onClick={() => handleViewChange('availability')}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'availability' ? 'primary.light' : 'transparent',
                                color: selectedView === 'availability' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'availability' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'availability' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <CalendarIcon />
                            </ListItemIcon>
                            <ListItemText primary="Schedule Availability" />
                        </ListItem>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'classes'}
                            onClick={() => handleViewChange('classes')}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'classes' ? 'primary.light' : 'transparent',
                                color: selectedView === 'classes' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'classes' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'classes' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <ClassIcon />
                            </ListItemIcon>
                            <ListItemText primary="My Classes" />
                        </ListItem>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'attendance'}
                            onClick={() => handleViewChange('attendance')}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'attendance' ? 'primary.light' : 'transparent',
                                color: selectedView === 'attendance' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'attendance' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'attendance' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <AttendanceIcon />
                            </ListItemIcon>
                            <ListItemText primary="Attendance" />
                        </ListItem>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'archive'}
                            onClick={() => handleViewChange('archive')}
                            sx={{
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'archive' ? 'primary.light' : 'transparent',
                                color: selectedView === 'archive' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'archive' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'archive' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <ArchiveIcon />
                            </ListItemIcon>
                            <ListItemText primary="Archive" />
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

            {/* --- Main Content Area --- */}
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                 {/* Toolbar spacer to push content below AppBar */}
                 <Toolbar />
                <Container maxWidth="lg">
                    
                    {isLoading ? (
                        <Typography>Loading data...</Typography>
                    ) : (
                        <>
                            {/* Use Suspense to wrap the view rendering */}
                            <Suspense fallback={
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                                    <CircularProgress />
                                </Box>
                            }>
                                {renderSelectedView()}
                            </Suspense>
                        </>
                    )}
                </Container>
            </Box>

            <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    Are you sure you want to remove this date from your availability?
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
                    <Button onClick={handleConfirmAction} color="primary">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Paper elevation={6} sx={{ padding: '6px 16px', bgcolor: snackbar.severity === 'success' ? 'lightgreen' : 'pink' }}>
                    <Typography>{snackbar.message}</Typography>
                </Paper>
            </Snackbar>
        </Box>
    );
};

export default InstructorPortal; 