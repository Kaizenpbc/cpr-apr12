import React, { useState, useEffect, useCallback } from 'react';
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
    Alert,
    IconButton,
    Divider,
    CircularProgress,
    Checkbox,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    AppBar,
    Toolbar,
} from '@mui/material';
import {
    CalendarMonth as CalendarIcon,
    Class as ClassIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    AssignmentTurnedIn as AttendanceIcon,
    Archive as ArchiveIcon,
    Logout as LogoutIcon,
    Dashboard as DashboardIcon,
} from '@mui/icons-material';
import InstructorArchiveTable from '../tables/InstructorArchiveTable';
import InstructorDashboard from '../dashboard/InstructorDashboard';

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
    const [selectedView, setSelectedView] = useState('dashboard');
    const [selectedDate, setSelectedDate] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [availableDates, setAvailableDates] = useState([]);
    const [scheduledClasses, setScheduledClasses] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [isLoading, setIsLoading] = useState(true);
    const [todaysClasses, setTodaysClasses] = useState([]);
    const [isLoadingTodaysClasses, setIsLoadingTodaysClasses] = useState(false);
    const [todaysClassesError, setTodaysClassesError] = useState('');
    const [studentsForAttendance, setStudentsForAttendance] = useState([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [studentsError, setStudentsError] = useState('');
    const [classToManage, setClassToManage] = useState(null);
    const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '' });
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [archivedCourses, setArchivedCourses] = useState([]);
    const [isLoadingArchive, setIsLoadingArchive] = useState(false);
    const [archiveError, setArchiveError] = useState('');

    const [currentDate, setCurrentDate] = useState(new Date());

    const showSnackbar = useCallback((message, severity = 'success') => {
        console.log('[showSnackbar] Setting snackbar state:', { open: true, message, severity });
        setSnackbar({ open: true, message, severity });
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
            
            // Set state directly with results from API
            // Store availableDates as a Set of YYYY-MM-DD strings for efficient lookup
            const availableDatesSet = new Set();
            availableDatesResult.forEach(dateStr => {
                try {
                    availableDatesSet.add(new Date(dateStr).toISOString().split('T')[0]);
                } catch (e) {
                    console.error(`Error parsing availability date from API: ${dateStr}`, e);
                }
            });
            console.log('[loadInitialData] BEFORE setAvailableDates (as Set YYYY-MM-DD). Data:', availableDatesSet);
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

    const loadArchivedCourses = useCallback(async () => {
        setIsLoadingArchive(true);
        setArchiveError('');
        console.log('[loadArchivedCourses] Fetching...');
        try {
            const data = await api.getInstructorCompletedCourses();
            setArchivedCourses(data || []);
             console.log('[loadArchivedCourses] State updated:', data || []);
        } catch (err) {
            console.error('Error loading archived courses:', err);
            const errorMsg = err.message || 'Failed to load archive.';
            setArchiveError(errorMsg);
            showSnackbar(errorMsg, 'error');
            setArchivedCourses([]);
        } finally {
            setIsLoadingArchive(false);
             console.log('[loadArchivedCourses] Finished.');
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

        // Only load data here that is EXCLUSIVE to a specific view
        if (selectedView === 'archive') {
            loadArchivedCourses();
        } else if (selectedView === 'attendance') {
             // Auto-select class if only one scheduled
             // The main data (scheduledClasses) should already be loaded by the first effect
             if (scheduledClasses.length === 1) {
                 console.log('[useEffect View Change] Auto-selecting the only scheduled class for attendance.');
                 setClassToManage(scheduledClasses[0]);
             }
        }
        // Removed loadInitialData call from here - let the first useEffect handle it
    }, [selectedView, loadArchivedCourses, scheduledClasses]); // Removed loadInitialData from deps

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

    const handleConfirmAction = async () => {
        if (confirmAction === 'remove') {
            try {
                const response = await api.removeAvailability(selectedDate);
                if (response.success) {
                    console.log('[handleConfirmAction] api.removeAvailability succeeded. Refreshing data...');
                    await loadInitialData(); 
                    showSnackbar('Date removed from availability');
                } else {
                    throw new Error(response.message || 'API failed to remove availability');
                }
            } catch (error) {
                console.error('Error removing availability:', error);
                showSnackbar(error.message || 'Failed to remove availability. Please try again.', 'error');
            }
        }
        setShowConfirmDialog(false);
        setSelectedDate(null);
        setConfirmAction(null);
    };

    const handlePreviousMonth = () => {
        setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
    };

    const handleLogout = () => {
        // Construct the message before logging out
        const firstName = user?.firstname || 'Instructor'; // Use fallback name
        const logoutMessage = `Bye ${firstName}, Keep Saving Lives!`;
        showSnackbar(logoutMessage, 'info'); // Show the message
        
        // Perform logout actions after a short delay to allow snackbar to show (optional but nice UX)
        setTimeout(() => {
            logout();
            navigate('/');
        }, 1500); // Delay in milliseconds (adjust as needed)
    };

    const handleAttendanceChange = async (studentId, currentAttendance) => {
        const newAttendance = !currentAttendance;
        console.log(`Updating attendance for student ${studentId} to ${newAttendance}`);
        
        setStudentsForAttendance(prevStudents => 
            prevStudents.map(s => s.studentid === studentId ? { ...s, attendance: newAttendance } : s)
        );
        
        try {
            const response = await api.updateStudentAttendance(studentId, newAttendance);
            if (!response.success) {
                setStudentsForAttendance(prevStudents => 
                    prevStudents.map(s => s.studentid === studentId ? { ...s, attendance: currentAttendance } : s)
                );
                showSnackbar(response.message || 'Failed to update attendance', 'error');
            }
        } catch (err) {
            setStudentsForAttendance(prevStudents => 
                prevStudents.map(s => s.studentid === studentId ? { ...s, attendance: currentAttendance } : s)
            );
            showSnackbar(err.message || 'Error updating attendance', 'error');
            console.error('Attendance update error:', err);
        }
    };

    const handleAddStudentChange = (event) => {
        setNewStudent(prev => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const handleAddStudentSubmit = async (event) => {
        event.preventDefault();
        if (!classToManage || !newStudent.firstName || !newStudent.lastName) {
            showSnackbar('Class must be selected, and First/Last name required to add student.', 'warning');
            return;
        }
        setIsAddingStudent(true);
        try {
            const response = await api.addStudentToCourse(classToManage.courseid, newStudent);
            if (response.success && response.student) {
                setStudentsForAttendance(prev => [...prev, { ...response.student, attendance: false }]);
                setNewStudent({ firstName: '', lastName: '', email: '' });
                showSnackbar('Student added successfully', 'success');
            } else {
                 showSnackbar(response.message || 'Failed to add student', 'error');
            }
        } catch (err) {
             showSnackbar(err.message || 'Error adding student', 'error');
             console.error('Add student error:', err);
        } finally {
             setIsAddingStudent(false);
        }
    };

    const handleMarkComplete = async () => {
        if (!classToManage) return;
        
        console.log(`Marking course ${classToManage.courseid} as complete.`);
        try {
            const response = await api.markCourseCompleted(classToManage.courseid);
            if (response.success) {
                showSnackbar('Course marked as completed!', 'success');
                setClassToManage(null);
                loadInitialData();
                loadArchivedCourses();
            } else {
                 showSnackbar(response.message || 'Failed to mark course complete', 'error');
            }
        } catch (err) {
             showSnackbar(err.message || 'Error marking course complete', 'error');
             console.error('Mark complete error:', err);
        }
    };

    // Function to format YYYY-MM-DD string to MM/DD/YYYY (or other preferred format)
    const formatDisplayDate = (isoDateString) => {
        if (!isoDateString) return 'N/A';
        try {
            const parts = isoDateString.split('-');
            if (parts.length === 3) {
                // Simple MM/DD/YYYY format
                return `${parts[1]}/${parts[2]}/${parts[0]}`;
            }
            return isoDateString; // Fallback
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const renderAvailabilityCalendar = () => {
        const displayMonth = currentDate.getMonth();
        const displayYear = currentDate.getFullYear();
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const today = new Date(); // Get today's date
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        console.log('[renderAvailabilityCalendar] Rendering for:', monthName, displayYear);
        console.log('[renderAvailabilityCalendar] State - availableDates:', availableDates, 'scheduledClasses:', scheduledClasses);

        const firstDay = new Date(displayYear, displayMonth, 1);
        const lastDay = new Date(displayYear, displayMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];
        for (let i = 0; i < startingDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(displayYear, displayMonth, i));
        }

        return (
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <IconButton onClick={handlePreviousMonth} aria-label="Previous Month" size="small">
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" component="div">
                        {monthName} {displayYear}
                    </Typography>
                    <IconButton onClick={handleNextMonth} aria-label="Next Month" size="small">
                        <ChevronRightIcon />
                    </IconButton>
                </Box>

                <Box display="flex" flexWrap="wrap">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <Box 
                            key={day} 
                            sx={{ 
                                width: 'calc(100% / 7)',
                                textAlign: 'center', 
                                py: 0.5,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                boxSizing: 'border-box'
                            }}
                        >
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    fontWeight: 'bold',
                                    color: 'text.secondary', 
                                    textTransform: 'uppercase' 
                                }}
                            >
                                {day}
                            </Typography>
                        </Box>
                    ))}

                    {days.map((date, index) => {
                        const dateString = date ? date.toDateString() : null;
                        const isoDateString = date ? date.toISOString().split('T')[0] : null; 
                        const isToday = date && date.toDateString() === today.toDateString(); // More precise today check
                        const isPastDate = date && date < today; // Check if date is before today
                        const isAvailable = availableDates.has(isoDateString);
                        const isHoliday = isoDateString && ontarioHolidays2024.has(isoDateString); // Check if it's a holiday

                        // Check if a class is scheduled on this date
                        const scheduledClassOnDate = date && scheduledClasses.find(course => 
                            course.datescheduled && 
                            new Date(course.datescheduled).toISOString().split('T')[0] === isoDateString
                        );

                        // Determine background color and content - PAST DATE takes precedence over AVAILABLE/HOLIDAY
                        let bgColor = undefined;
                        let dayContent = null;
                        let cellCursor = date ? 'pointer' : 'default';
                        let dateColor = isToday ? 'primary.main' : 'text.secondary';

                        if (!date) {
                            bgColor = '#f5f5f5 !important'; // Blank days
                        } else if (isPastDate) {
                            bgColor = '#fafafa !important'; // Different grey for past dates
                            dateColor = '#bdbdbd'; // Dim the date number
                            cellCursor = 'not-allowed'; // Indicate non-clickable
                        } else if (scheduledClassOnDate) { // Highest functional priority
                            bgColor = '#e3f2fd !important'; 
                            dayContent = <ClassIcon fontSize="small" sx={{ alignSelf: 'center', mt: 'auto', color: 'primary.main' }} />;
                            dateColor = 'text.primary';
                        } else if (isHoliday) { // Next priority
                            bgColor = '#eeeeee !important'; 
                            dayContent = <Typography variant="caption" component="span" sx={{ fontStyle: 'italic', color: 'text.secondary', alignSelf: 'center', mt: 'auto' }}>H</Typography>; 
                            dateColor = 'text.primary';
                            cellCursor = 'not-allowed'; // Make holidays non-clickable too
                        } else if (isAvailable) { // Lowest priority
                            bgColor = '#fffde7 !important'; 
                            dayContent = <Typography variant="caption" component="span" sx={{ fontWeight: 'bold', color: 'success.main', alignSelf: 'center', mt: 'auto' }}>A</Typography>;
                            dateColor = 'text.primary';
                        }
                        // Highlight today if it doesn't have another specific background
                        if (isToday && !scheduledClassOnDate && !isHoliday && !isAvailable && !isPastDate) {
                             bgColor = '#e8f5e9 !important'; 
                             dateColor = 'primary.main';
                        }

                        return (
                            <Box 
                                key={date ? dateString : `blank-${index}`}
                                // Prevent clicking on holidays or past dates
                                onClick={() => date && !isHoliday && !isPastDate && handleDateClick(date)}
                                sx={{ 
                                    width: 'calc(100% / 7)', 
                                    minHeight: '5em',
                                    cursor: cellCursor, // Use determined cursor style
                                    borderRight: (index % 7 < 6) ? '1px solid' : 'none',
                                    borderBottom: (index < days.length - (days.length % 7)) || days.length % 7 === 0 ? '1px solid' : 'none',
                                    borderColor: 'divider', 
                                    boxSizing: 'border-box',
                                    transition: 'background-color 0.15s',
                                    '&:hover': date ? {
                                        bgcolor: 'action.hover' 
                                    } : {},
                                    backgroundColor: bgColor, // Apply determined background
                                }}
                            >
                                {date ? (
                                    <Box 
                                        sx={{
                                            width: '100%', 
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column', 
                                            alignItems: 'flex-start',
                                            p: 0.5, 
                                            border: isToday ? '2px solid' : 'none',
                                            borderColor: isToday ? 'primary.main' : 'transparent',
                                            color: dateColor, 
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <Typography 
                                            variant="caption" 
                                            component="span"
                                            sx={{ 
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {date.getDate()}
                                        </Typography>
                                        {/* Wrapper to center content in remaining space */}
                                        <Box sx={{ 
                                            flexGrow: 1, // Make this box fill remaining vertical space
                                            width: '100%', // Ensure it uses full width for horizontal centering
                                            display: 'flex', 
                                            alignItems: 'center', // Vertically center content within this box
                                            justifyContent: 'center' // Horizontally center content within this box
                                        }}>
                                            {/* Ensure dayContent itself doesn't override alignment if it's a Typography */}
                                            {React.isValidElement(dayContent) ? React.cloneElement(dayContent, { sx: { ...dayContent.props.sx, alignSelf: 'center', mt: 0 } }) : dayContent}
                                        </Box>
                                    </Box>
                                ) : null}
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        );
    };

    const renderMyClasses = () => {
        // Get scheduled classes and AVAILABLE DATES (Set) from state
        const classesToDisplay = Array.isArray(scheduledClasses) ? scheduledClasses : [];
        // Ensure availableDates is treated as a Set, default to empty Set if needed
        const currentAvailableDatesSet = (availableDates instanceof Set) ? availableDates : new Set(); 
        // Convert Set to array for mapping
        const availabilityDatesArray = Array.from(currentAvailableDatesSet);

        // <<< ADD LOGGING >>>
        console.log('[renderMyClasses] Received scheduledClasses state:', classesToDisplay);
        console.log('[renderMyClasses] Received availableDates state (Set):', currentAvailableDatesSet);
        console.log('[renderMyClasses] Converted availabilityDates to Array:', availabilityDatesArray);
        // <<< END LOGGING >>>

        // Combine items
        const combinedItems = [
            ...classesToDisplay.map(course => {
                const scheduledIsoDate = course.datescheduled ? new Date(course.datescheduled).toISOString().split('T')[0] : null;
                return {
                    ...course,
                    type: 'class',
                    sortDate: new Date(course.datescheduled || 0), // Keep for sorting
                    displayDate: formatDisplayDate(scheduledIsoDate), // Use formatted UTC date string for display
                    key: `class-${course.courseid}` 
                };
            }),
            ...availabilityDatesArray.map(dateString => { // dateString is YYYY-MM-DD
                return {
                    type: 'availability',
                    sortDate: new Date(dateString), // Keep for sorting
                    displayDate: formatDisplayDate(dateString), // Use formatted date string for display
                    dateString: dateString,
                    key: `avail-${dateString}` 
                };
            })
        ];

        // Sort combined items by date
        combinedItems.sort((a, b) => a.sortDate - b.sortDate);

        console.log('[renderMyClasses] Combined and sorted items:', combinedItems);

        return (
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Organization</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Course No</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Course Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Students R</TableCell> 
                            <TableCell sx={{ fontWeight: 'bold' }}>Students A</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {combinedItems.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={9} align="center">No classes scheduled or availability set.</TableCell>
                             </TableRow>
                        ) : (
                            combinedItems.map((item) => (
                                <TableRow 
                                    key={item.key}
                                    sx={{
                                        // Apply conditional background color
                                        backgroundColor: item.type === 'class' ? '#e3f2fd' // Light blue for classes (like calendar)
                                                     : item.type === 'availability' ? '#fffde7' // Light yellow for availability (like calendar)
                                                     : undefined,
                                        // Adjust hover style slightly if needed
                                        '&:hover': {
                                            backgroundColor: item.type === 'class' ? '#bbdefb' 
                                                         : item.type === 'availability' ? '#fff9c4' 
                                                         : 'action.hover'
                                        }
                                    }}
                                >
                                    <TableCell>{item.displayDate}</TableCell>
                                    {item.type === 'class' ? (
                                        <> 
                                            <TableCell>{item.organizationname || '-'}</TableCell>
                                            <TableCell>{item.location || '-'}</TableCell>
                                            <TableCell>{item.coursenumber || '-'}</TableCell>
                                            <TableCell>{item.coursetypename || '-'}</TableCell>
                                            <TableCell align="center">{item.studentsregistered ?? '-'}</TableCell>
                                            <TableCell align="center">{item.studentsattendance ?? '-'}</TableCell>
                                            <TableCell>{item.notes || '-'}</TableCell>
                                            <TableCell>{item.status}</TableCell>
                                        </>
                                    ) : (
                                        <> 
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>Available</TableCell>
                                        </>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    };

    const renderAttendance = () => {
        if (isLoading) return <CircularProgress />;
        
        if (scheduledClasses.length === 0) return <Typography>No classes currently scheduled.</Typography>;
        
        const handleClassSelectionChange = (event) => {
            const selectedId = event.target.value;
            const selected = scheduledClasses.find(c => c.courseid === selectedId);
            console.log(`[renderAttendance] Class selected from dropdown: ID=${selectedId}`, selected);
            setClassToManage(selected || null);
        };

        if (scheduledClasses.length > 1 && !classToManage) {
             return (
                <Box>
                     <Typography sx={{ mb: 2 }}>Please select a scheduled class to manage attendance:</Typography>
                     <FormControl fullWidth>
                         <InputLabel id="class-select-label">Select Class</InputLabel>
                         <Select
                             labelId="class-select-label"
                             value={''}
                             label="Select Class"
                             onChange={handleClassSelectionChange}
                         >
                             {scheduledClasses.map((course) => (
                                 <MenuItem key={course.courseid} value={course.courseid}>
                                     {`${new Date(course.datescheduled).toLocaleDateString()} - ${course.coursenumber} (${course.organizationname})`}
                                 </MenuItem>
                             ))}
                         </Select>
                     </FormControl>
                </Box>
             );
        }

        if (!classToManage) {
             console.log('[renderAttendance] Waiting for class selection or auto-selection effect...');
             return <CircularProgress />;
        }

        return (
            <Box>
                 {scheduledClasses.length > 0 && (
                     <FormControl fullWidth sx={{ mb: 3 }}>
                         <InputLabel id="class-select-label">Selected Class</InputLabel>
                         <Select
                             labelId="class-select-label"
                             value={classToManage.courseid}
                             label="Selected Class"
                             onChange={handleClassSelectionChange}
                         >
                             {scheduledClasses.map((course) => (
                                 <MenuItem key={course.courseid} value={course.courseid}>
                                     {`${new Date(course.datescheduled).toLocaleDateString()} - ${course.coursenumber} (${course.organizationname})`}
                                 </MenuItem>
                             ))}
                         </Select>
                     </FormControl>
                 )}

                <Typography variant="h6" gutterBottom>
                    {classToManage.coursetypename} ({classToManage.coursenumber}) - {classToManage.organizationname}
                </Typography>
                <Typography variant="body1" gutterBottom>
                    Date: {new Date(classToManage.datescheduled).toLocaleDateString()} | Location: {classToManage.location}
                </Typography>
                
                <Paper sx={{ my: 2, p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Student List ({studentsForAttendance.length} / {classToManage.studentsregistered ?? '?'})</Typography>
                    {isLoadingStudents && <CircularProgress size={20}/>}
                    {studentsError && <Alert severity="error">{studentsError}</Alert>}
                    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {studentsForAttendance.map((student) => (
                            <ListItem 
                                key={student.studentid}
                                secondaryAction={
                                    <Checkbox
                                        edge="end"
                                        onChange={() => handleAttendanceChange(student.studentid, student.attendance)}
                                        checked={!!student.attendance}
                                        inputProps={{ 'aria-labelledby': `checkbox-list-label-${student.studentid}` }}
                                    />
                                }
                                disablePadding
                            >
                                <ListItemText 
                                    id={`checkbox-list-label-${student.studentid}`} 
                                    primary={`${student.lastname}, ${student.firstname}`} 
                                    secondary={student.email || 'No email'} 
                                />
                            </ListItem>
                        ))}
                    </List>
                </Paper>

                <Paper sx={{ my: 2, p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Add Student</Typography>
                    <Box component="form" onSubmit={handleAddStudentSubmit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField size="small" label="First Name" name="firstName" value={newStudent.firstName} onChange={handleAddStudentChange} required disabled={isAddingStudent} />
                        <TextField size="small" label="Last Name" name="lastName" value={newStudent.lastName} onChange={handleAddStudentChange} required disabled={isAddingStudent} />
                        <TextField size="small" label="Email (Optional)" name="email" type="email" value={newStudent.email} onChange={handleAddStudentChange} disabled={isAddingStudent} />
                        <Button type="submit" variant="contained" size="small" disabled={isAddingStudent}>
                            {isAddingStudent ? <CircularProgress size={20} /> : 'Add'}
                        </Button>
                    </Box>
                </Paper>

                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleMarkComplete}
                    sx={{ mt: 2 }}
                >
                    Mark Course as Completed
                </Button>
            </Box>
        );
    };

    const renderArchive = () => {
        if (isLoadingArchive) return <CircularProgress />;
        if (archiveError) return <Alert severity="error">{archiveError}</Alert>;
        
        return (
            <>
                <Typography variant="h5" gutterBottom>Archived Courses</Typography>
                <InstructorArchiveTable courses={archivedCourses} />
            </>
        );
    };

    const renderSelectedView = () => {
        switch (selectedView) {
            case 'dashboard':
                return <InstructorDashboard scheduledClasses={scheduledClasses} />;
            case 'availability':
                return renderAvailabilityCalendar();
            case 'classes':
                return renderMyClasses();
            case 'attendance':
                return renderAttendance();
            case 'archive':
                return renderArchive();
            default:
                return <Typography>Select a view</Typography>;
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
                        // Removed mt: 8 - Toolbar adds offset
                    },
                }}
            >
                {/* Toolbar spacer to push content below AppBar */}
                <Toolbar /> 
                <Box sx={{ overflow: 'auto' }}> 
                    <List>
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
                        <ListItem 
                            component="div"
                            selected={selectedView === 'availability'}
                            onClick={() => setSelectedView('availability')}
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
                            onClick={() => setSelectedView('classes')}
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
                            onClick={() => setSelectedView('attendance')}
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
                            onClick={() => setSelectedView('archive')}
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
                            {renderSelectedView()}
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