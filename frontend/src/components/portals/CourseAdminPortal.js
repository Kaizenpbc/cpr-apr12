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
    TableSortLabel,
    AppBar,
    Toolbar
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People as PeopleIcon, // For Instructor Dashboard
    PendingActions as PendingActionsIcon, // For Pending Courses
    EventAvailable as EventAvailableIcon, // For Scheduled Courses
    AssignmentTurnedIn as CompletedIcon, // Icon for Completed
    Assessment as ReportsIcon, // Add Reports icon
    Logout as LogoutIcon,
} from '@mui/icons-material';
import * as api from '../../services/api';
import InstructorDashboardTable from '../tables/InstructorDashboardTable';
import PendingCoursesTable from '../tables/PendingCoursesTable';
import ScheduledCoursesTable from '../tables/ScheduledCoursesTable';
import CompletedCoursesTable from '../tables/CompletedCoursesTable';
import InstructorWorkloadSummaryTable from '../tables/InstructorWorkloadSummaryTable';
import ViewStudentsDialog from '../dialogs/ViewStudentsDialog';
import ScheduleCourseDialog from '../dialogs/ScheduleCourseDialog';
import CancelCourseDialog from '../dialogs/CancelCourseDialog';
import AdminReportsView from '../views/AdminReportsView';

const drawerWidth = 240;

const CourseAdminPortal = () => {
    const { user, logout, socket } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState('instructors');
    const [instructorData, setInstructorData] = useState([]);
    const [isLoadingInstructors, setIsLoadingInstructors] = useState(false);
    const [instructorsError, setInstructorsError] = useState('');
    const [instructorWorkloads, setInstructorWorkloads] = useState([]);
    const [isLoadingWorkload, setIsLoadingWorkload] = useState(false);
    const [workloadError, setWorkloadError] = useState('');
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
    const [orgCoursesSortOrder, setOrgCoursesSortOrder] = useState('asc');
    const [orgCoursesSortBy, setOrgCoursesSortBy] = useState('daterequested');
    // State for Cancel Dialog
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [courseToCancel, setCourseToCancel] = useState(null); // Store {id, number}

    // --- useCallback wrapped functions FIRST ---
    const showSnackbar = useCallback((message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleLogout = () => {
        // Add Snackbar message
        const firstName = user?.FirstName || 'Admin'; 
        const logoutMessage = `Goodbye ${firstName}, Have a Productive Day!`;
        showSnackbar(logoutMessage, 'info');

        setTimeout(() => {
            logout();
            navigate('/');
        }, 1500); 
    };

    const loadInstructorViewData = useCallback(async () => {
        // Load main dashboard data
        setIsLoadingInstructors(true);
        setInstructorsError('');
        console.log('[loadInstructorViewData] Fetching main dashboard data...'); 
        const dashboardPromise = api.getInstructorDashboard()
            .then(data => {
                console.log('[loadInstructorViewData] Main dashboard API Response:', data);
                setInstructorData(data);
            })
            .catch(err => {
                console.error('Error loading instructor dashboard:', err);
                const errorMsg = err.message || 'Failed to load instructor data.';
                setInstructorsError(errorMsg);
                setInstructorData([]);
            })
            .finally(() => setIsLoadingInstructors(false));

        // Load workload summary data
        setIsLoadingWorkload(true);
        setWorkloadError('');
        console.log('[loadInstructorViewData] Fetching workload summary...');
        const workloadPromise = api.getInstructorWorkloads()
            .then(data => {
                console.log('[loadInstructorViewData] Workload API Response:', data);
                setInstructorWorkloads(data || []);
            })
            .catch(err => {
                console.error('Error loading instructor workload:', err);
                const errorMsg = err.message || 'Failed to load workload summary.';
                setWorkloadError(errorMsg);
                setInstructorWorkloads([]);
            })
            .finally(() => setIsLoadingWorkload(false));
        
        // Wait for both fetches to complete (optional, could render parts as they load)
        await Promise.all([dashboardPromise, workloadPromise]);
        console.log('[loadInstructorViewData] Finished loading all data for instructor view.');

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

    const loadWorkloadSummary = useCallback(async () => {
        setIsLoadingWorkload(true);
        setWorkloadError('');
        console.log('[loadWorkloadSummary] Fetching workload summary...');
        try {
            const data = await api.getInstructorWorkloads();
            console.log('[loadWorkloadSummary] Workload API Response:', data);
            setInstructorWorkloads(data || []);
        } catch (err) {
            console.error('Error loading instructor workload:', err);
            const errorMsg = err.message || 'Failed to load workload summary.';
            setWorkloadError(errorMsg);
            setInstructorWorkloads([]);
        } finally {
            setIsLoadingWorkload(false);
        }
    }, []);

    // --- useEffect hooks NEXT ---
    useEffect(() => {
        loadAllInstructors();
    }, [loadAllInstructors]);

    // Main useEffect to load data based on selected view
    useEffect(() => {
        if (selectedView === 'instructors') {
            console.log('[useEffect] Loading ALL instructor view data...');
            loadInstructorViewData();
        } else if (selectedView === 'pending') {
            console.log('[useEffect] Loading pending courses AND workload summary...');
            loadPendingCourses();
            loadWorkloadSummary();
        } else if (selectedView === 'scheduled') {
            console.log('[useEffect] Loading scheduled courses...');
            loadScheduledCourses();
        } else if (selectedView === 'completed') {
            console.log('[useEffect] Loading completed courses...');
            loadCompletedCourses();
        }
    }, [selectedView, loadInstructorViewData, loadPendingCourses, loadScheduledCourses, loadCompletedCourses, loadWorkloadSummary]);

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

    // Open Cancel Dialog
    const handleCancelClick = (courseId, courseNumber) => {
        console.log(`[AdminPortal] Cancel clicked for Course ID: ${courseId}, Number: ${courseNumber}`);
        setCourseToCancel({ id: courseId, number: courseNumber });
        setShowCancelDialog(true);
    };

    // Close Cancel Dialog
    const handleCancelDialogClose = () => {
        setShowCancelDialog(false);
        setCourseToCancel(null);
    };

    // Confirm Cancellation Action
    const handleConfirmCancel = async () => {
        if (!courseToCancel || !courseToCancel.id) return;
        
        const courseId = courseToCancel.id;
        const courseNumber = courseToCancel.number;
        console.log(`[AdminPortal] Confirming cancellation for course ${courseId}`);
        setShowCancelDialog(false); // Close dialog immediately
        
        try {
            const response = await api.cancelCourse(courseId);
            if (response.success) {
                showSnackbar(response.message || `Course ${courseNumber} cancelled successfully.`, 'success');
                // Refresh relevant lists
                loadPendingCourses(); 
                loadScheduledCourses();
            } else {
                throw new Error(response.message || 'Cancellation failed on server.');
            }
        } catch (err) {
            console.error(`Error cancelling course ${courseId}:`, err);
            showSnackbar(err.message || 'An error occurred during cancellation.', 'error');
        } finally {
             setCourseToCancel(null); // Clear selected course
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
                
                console.log(`[renderSelectedView: instructors] Workload State: isLoading=${isLoadingWorkload}, error=${workloadError}, DATA_LEN=${instructorWorkloads.length}`);

                return (
                    <>
                        {/* Render Workload Summary Table */}
                        {isLoadingWorkload ? (
                            <CircularProgress />
                        ) : workloadError ? (
                            <Alert severity="error">{workloadError}</Alert>
                        ) : (
                            <InstructorWorkloadSummaryTable workloads={instructorWorkloads} />
                        )}

                        {/* Existing Filters and Instructor Dashboard Table */}
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
                console.log(`[renderSelectedView: pending] Workload State: isLoading=${isLoadingWorkload}, error=${workloadError}, DATA_LEN=${instructorWorkloads.length}`);

                return (
                    <>
                        {/* Render Workload Summary Table First */}
                        {isLoadingWorkload ? (
                            <CircularProgress />
                        ) : workloadError ? (
                            <Alert severity="error" sx={{ mb: 2 }}>{`Workload Summary Error: ${workloadError}`}</Alert>
                        ) : (
                            <InstructorWorkloadSummaryTable workloads={instructorWorkloads} />
                        )}

                        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Pending Course Requests</Typography> {/* Add title for clarity */}

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
                                onCancelClick={handleCancelClick}
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
                                onCancelClick={handleCancelClick}
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
            case 'reports': 
                 console.log('[renderSelectedView: reports]');
                 return <AdminReportsView />;
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
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
                        Course Admin Portal
                    </Typography>
                    <Typography variant="body1" noWrap sx={{ mr: 2 }}>
                        Welcome {user?.FirstName || 'Admin User'}!
                    </Typography>
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
                        // mt: 8, // Remove offset handled by Toolbar
                        // height: 'calc(100% - 64px)' // Remove if not needed
                    },
                }}
            >
                {/* Toolbar spacer */}
                 <Toolbar />
                 <Box sx={{ overflow: 'auto' }}>
                     <List>
                        {/* Dashboard Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'dashboard'}
                            onClick={() => setSelectedView('dashboard')}
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

                        {/* Instructor Dashboard Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'instructors'}
                            onClick={() => setSelectedView('instructors')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'instructors' ? 'primary.light' : 'transparent',
                                color: selectedView === 'instructors' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'instructors' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'instructors' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <PeopleIcon />
                            </ListItemIcon>
                            <ListItemText primary="Instructor Dashboard" />
                        </ListItem>

                         {/* Pending Courses Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'pending'}
                            onClick={() => setSelectedView('pending')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'pending' ? 'primary.light' : 'transparent',
                                color: selectedView === 'pending' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'pending' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'pending' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <PendingActionsIcon />
                            </ListItemIcon>
                            <ListItemText primary="Pending Courses" />
                        </ListItem>

                        {/* Scheduled Courses Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'scheduled'}
                            onClick={() => setSelectedView('scheduled')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'scheduled' ? 'primary.light' : 'transparent',
                                color: selectedView === 'scheduled' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'scheduled' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'scheduled' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <EventAvailableIcon />
                            </ListItemIcon>
                            <ListItemText primary="Scheduled Courses" />
                        </ListItem>

                        {/* Completed Courses Item */}
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'completed'}
                            onClick={() => setSelectedView('completed')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'completed' ? 'primary.light' : 'transparent',
                                color: selectedView === 'completed' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'completed' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'completed' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}>
                                <CompletedIcon />
                            </ListItemIcon>
                            <ListItemText primary="Completed Courses" />
                        </ListItem>

                        {/* Reports Item - NEW */}
                         <ListItem 
                            component="div"
                            selected={selectedView === 'reports'}
                            onClick={() => setSelectedView('reports')}
                             sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'reports' ? 'primary.light' : 'transparent',
                                color: selectedView === 'reports' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'reports' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'reports' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}><ReportsIcon /></ListItemIcon>
                            <ListItemText primary="Reports" />
                        </ListItem>

                        <Divider sx={{ my: 1 }} />

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

            {/* Cancel Course Dialog */} 
            <CancelCourseDialog
                open={showCancelDialog}
                onClose={handleCancelDialogClose}
                onConfirm={handleConfirmCancel}
                courseId={courseToCancel?.id}
                courseNumber={courseToCancel?.number}
            />

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