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
} from '@mui/material';
import {
    CalendarMonth as CalendarIcon,
    Class as ClassIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    AssignmentTurnedIn as AttendanceIcon,
    Archive as ArchiveIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import InstructorArchiveTable from '../tables/InstructorArchiveTable';

const drawerWidth = 240;

const InstructorPortal = () => {
    const { user, logout, socket } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState('availability');
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
            const [availabilityResponse, classesResponse] = await Promise.all([
                api.getAvailability(),
                api.getScheduledClasses()
            ]);
            
            let rawAvailableDates = [];
            let rawScheduledClasses = [];

            if (Array.isArray(availabilityResponse)) { 
                rawAvailableDates = availabilityResponse;
            }
            if (classesResponse && Array.isArray(classesResponse.classes)) {
                rawScheduledClasses = classesResponse.classes;
            }

            const scheduledDatesSet = new Set();
            rawScheduledClasses.forEach(course => {
                if (course.datescheduled) {
                    try {
                        const dateStr = new Date(course.datescheduled).toISOString().split('T')[0];
                        scheduledDatesSet.add(dateStr);
                    } catch (e) {
                        console.error(`Error parsing scheduled date: ${course.datescheduled}`, e);
                    }
                }
            });
            console.log('[loadInitialData] Set of scheduled dates (YYYY-MM-DD):', scheduledDatesSet);

            const filteredAvailableDates = rawAvailableDates.filter(dateString => {
                try {
                    const availDateStr = new Date(dateString).toISOString().split('T')[0];
                    return !scheduledDatesSet.has(availDateStr);
                } catch (e) {
                    console.error(`Error parsing availability date: ${dateString}`, e);
                    return false;
                }
            });
            console.log('[loadInitialData] Filtered availability dates:', filteredAvailableDates);
            
            setAvailableDates(filteredAvailableDates);
            setScheduledClasses(rawScheduledClasses);
            console.log('[loadInitialData] State updated with filtered availability');
            
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
        setStudentsForAttendance([]);
        setClassToManage(null);
        setStudentsError('');

        if (selectedView === 'archive') {
            loadArchivedCourses();
        } else if (selectedView === 'classes' || selectedView === 'availability') {
            loadInitialData();
        } else if (selectedView === 'attendance') {
            console.log('[useEffect View Change] Attendance view selected. Data should be loaded by other effect.');
            if (scheduledClasses.length === 1) {
                console.log('[useEffect View Change] Auto-selecting the only scheduled class for attendance.');
                setClassToManage(scheduledClasses[0]);
            }
        }
    }, [selectedView]);

    useEffect(() => {
        if (classToManage) {
            console.log(`[useEffect classToManage] Class to manage selected: ${classToManage.courseid}. Fetching students.`);
            fetchStudentsForClass(classToManage.courseid);
        } else {
            setStudentsForAttendance([]);
        }
    }, [classToManage, fetchStudentsForClass]);

    const handleDateClick = async (dateString) => {
        console.log('[handleDateClick] Date clicked:', dateString);
        const isAvailable = availableDates.includes(dateString);
        console.log('[handleDateClick] Is available?', isAvailable);
        if (isAvailable) {
            setConfirmAction('remove');
            setSelectedDate(dateString);
            setShowConfirmDialog(true);
        } else {
            try {
                console.log('[handleDateClick] Calling api.addAvailability...');
                await api.addAvailability(dateString);
                console.log('[handleDateClick] api.addAvailability succeeded. Updating state...');
                setAvailableDates(prevDates => [...prevDates, dateString]);
                console.log('[handleDateClick] State update complete. Showing snackbar...');
                showSnackbar('Date marked as available');
            } catch (error) {
                console.error('Error adding availability:', error);
                showSnackbar(error.message || 'Failed to add availability. Please try again.', 'error');
            }
        }
    };

    const handleConfirmAction = async () => {
        if (confirmAction === 'remove') {
            try {
                await api.removeAvailability(selectedDate);
                setAvailableDates(availableDates.filter(d => d !== selectedDate));
                showSnackbar('Date removed from availability');
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
        logout();
        navigate('/');
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

    const renderAvailabilityCalendar = () => {
        const displayMonth = currentDate.getMonth();
        const displayYear = currentDate.getFullYear();
        const monthName = currentDate.toLocaleString('default', { month: 'long' });

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
                            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}>
                                {day}
                            </Typography>
                        </Box>
                    ))}

                    {days.map((date, index) => {
                        const dateString = date ? date.toDateString() : null;
                        const isToday = date && new Date().toDateString() === dateString;
                        const isAvailable = dateString && availableDates.includes(dateString);

                        return (
                            <Box 
                                key={date ? dateString : `blank-${index}`}
                                onClick={() => dateString && handleDateClick(dateString)}
                                sx={{ 
                                    width: 'calc(100% / 7)', 
                                    aspectRatio: '1 / 1', 
                                    cursor: date ? 'pointer' : 'default',
                                    borderRight: (index % 7 < 6) ? '1px solid' : 'none',
                                    borderBottom: (index < days.length - (days.length % 7)) || days.length % 7 === 0 ? '1px solid' : 'none',
                                    borderColor: 'divider', 
                                    boxSizing: 'border-box',
                                    transition: 'background-color 0.15s',
                                    '&:hover': date ? {
                                        bgcolor: 'action.hover' 
                                    } : {},
                                    backgroundColor: isToday ? '#e8f5e9 !important' : 
                                             isAvailable ? '#fffde7 !important' :
                                            !date ? '#f5f5f5 !important' : 
                                             undefined, 
                                }}
                            >
                                {date ? (
                                    <Box 
                                        sx={{
                                            width: '100%', 
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column', 
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            p: 0.5, 
                                            border: isToday ? '2px solid' : 'none',
                                            borderColor: isToday ? 'primary.main' : 'transparent',
                                            color: isAvailable ? 'text.primary' : isToday ? 'primary.main' : 'text.secondary', 
                                        }}
                                    >
                                        <Typography 
                                            variant="caption" 
                                            component="span"
                                            sx={{ 
                                                fontWeight: isToday ? 'bold' : 'normal',
                                            }}
                                        >
                                            {date.getDate()}
                                        </Typography>
                                        {isAvailable && (
                                            <Typography 
                                                variant="caption" 
                                                component="span" 
                                                sx={{ 
                                                    fontWeight: 'bold', 
                                                    color: 'green',
                                                    alignSelf: 'center',
                                                    mt: 'auto'
                                                }}
                                            >
                                                A
                                            </Typography>
                                        )}
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
        // Get scheduled classes and AVAILABLE DATES (already filtered) from state
        const classesToDisplay = Array.isArray(scheduledClasses) ? scheduledClasses : [];
        const availabilityDates = Array.isArray(availableDates) ? availableDates : [];

        console.log('[renderMyClasses] Rendering scheduledClasses (state):', classesToDisplay);
        console.log('[renderMyClasses] Rendering availableDates (state, pre-filtered):', availabilityDates);

        // Combine classes and availability into a single list with type and comparable date
        const combinedItems = [
            ...classesToDisplay.map(course => ({
                ...course,
                type: 'class',
                sortDate: new Date(course.datescheduled),
                key: `class-${course.courseid}` // Unique key for React
            })),
            ...availabilityDates.map(dateString => ({
                type: 'availability',
                sortDate: new Date(dateString), 
                dateString: dateString,
                key: `avail-${dateString}` // Unique key for React
            }))
        ];

        // Sort combined items by date
        combinedItems.sort((a, b) => a.sortDate - b.sortDate);

        console.log('[renderMyClasses] Combined and sorted items:', combinedItems);

        return (
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Organization</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Course No</TableCell>
                            <TableCell>Course Type</TableCell>
                            <TableCell>Students R</TableCell> 
                            <TableCell>Students A</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {combinedItems.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={9} align="center">No classes scheduled or availability set.</TableCell>
                             </TableRow>
                        ) : (
                            combinedItems.map((item) => (
                                <TableRow key={item.key}>
                                    <TableCell>{item.sortDate.toLocaleDateString()}</TableCell>
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
                            selected={selectedView === 'availability'}
                            onClick={() => setSelectedView('availability')}
                        >
                            <ListItemIcon>
                                <CalendarIcon />
                            </ListItemIcon>
                            <ListItemText primary="Schedule Availability" />
                        </ListItem>
                        <ListItem 
                            component="div"
                            selected={selectedView === 'classes'}
                            onClick={() => setSelectedView('classes')}
                        >
                            <ListItemIcon>
                                <ClassIcon />
                            </ListItemIcon>
                            <ListItemText primary="My Classes" />
                        </ListItem>
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'attendance'}
                            onClick={() => setSelectedView('attendance')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <AttendanceIcon />
                            </ListItemIcon>
                            <ListItemText primary="Attendance" />
                        </ListItem>
                        <ListItem 
                            component="div" 
                            selected={selectedView === 'archive'}
                            onClick={() => setSelectedView('archive')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon>
                                <ArchiveIcon />
                            </ListItemIcon>
                            <ListItemText primary="Archive" />
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

            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Container maxWidth="lg">
                    <Typography variant="h4" gutterBottom>
                        Welcome, {user.firstname} {user.lastname}
                    </Typography>
                    
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