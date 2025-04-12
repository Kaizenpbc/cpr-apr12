import React from 'react';
import { Box, Typography, Button, IconButton, Paper } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ClassIcon from '@mui/icons-material/Class'; // Needed for dayContent
import { formatDate, formatDisplayDate } from '../../utils/formatters'; // Use shared formatters

// This component receives the necessary state and handlers as props
const AvailabilityView = ({
    currentDate,
    handlePreviousMonth,
    handleNextMonth,
    availableDates, // Set of YYYY-MM-DD strings
    scheduledClasses, // Array of course objects
    ontarioHolidays2024, // Set of YYYY-MM-DD holiday strings
    handleDateClick
}) => {

    // Logic from renderAvailabilityCalendar starts here
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...
    
    const days = [];
    // Add blank days for the start of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
    }
    // Add actual days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    const displayYear = currentDate.getFullYear();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 

    return (
        <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <IconButton onClick={handlePreviousMonth}><NavigateBeforeIcon /></IconButton>
                <Typography variant="h6">{monthName} {displayYear}</Typography>
                <IconButton onClick={handleNextMonth}><NavigateNextIcon /></IconButton>
            </Box>

            <Box display="flex" borderBottom={1} borderColor="divider" mb={1}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <Box 
                        key={day} 
                        sx={{ width: 'calc(100% / 7)', textAlign: 'center', py: 1 }}
                    >
                        <Typography 
                            variant="caption" 
                            sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase' }}
                        >
                            {day}
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box display="flex" flexWrap="wrap">
                {days.map((date, index) => {
                    // --- Paste the complex per-day rendering logic from InstructorPortal here --- 
                    // (This includes checks for isToday, isPastDate, isAvailable, isHoliday, scheduledClassOnDate 
                    // and determining bgColor, dayContent, cellCursor, dateColor)
                    // Make sure to use the props passed to this component (availableDates, scheduledClasses, etc.)
                    const dateString = date ? date.toDateString() : null;
                    const isoDateString = date ? date.toISOString().split('T')[0] : null; 
                    const isToday = date && date.toDateString() === today.toDateString(); 
                    const isPastDate = date && date < today; 
                    const isAvailable = isoDateString && availableDates.has(isoDateString);
                    const isHoliday = isoDateString && ontarioHolidays2024.has(isoDateString);
                    const scheduledClassOnDate = date && scheduledClasses.find(course => 
                        course.datescheduled && 
                        new Date(course.datescheduled).toISOString().split('T')[0] === isoDateString
                    );

                    let bgColor = undefined;
                    let dayContent = null;
                    let cellCursor = date ? 'pointer' : 'default';
                    let dateColor = isToday ? 'primary.main' : 'text.secondary';

                    if (!date) {
                        bgColor = '#f5f5f5 !important'; 
                    } else if (isPastDate) {
                        bgColor = '#fafafa !important'; 
                        dateColor = '#bdbdbd'; 
                        cellCursor = 'not-allowed'; 
                    } else if (scheduledClassOnDate) { 
                        bgColor = '#e3f2fd !important'; 
                        const orgName = scheduledClassOnDate.organizationname || '';
                        const orgAbbr = orgName.substring(0, 3).toUpperCase() || 'N/A';
                        dayContent = (
                            <Typography variant="caption" component="span" sx={{fontWeight: 'bold', color: 'primary.dark', alignSelf: 'center', mt: 'auto' }}>
                                {orgAbbr}
                            </Typography>
                        );
                        dateColor = 'text.primary';
                        cellCursor = 'not-allowed'; 
                    } else if (isHoliday) { 
                        bgColor = '#eeeeee !important'; 
                        dayContent = <Typography variant="caption" component="span" sx={{ fontStyle: 'italic', color: 'text.secondary', alignSelf: 'center', mt: 'auto' }}>H</Typography>; 
                        dateColor = 'text.primary';
                        cellCursor = 'not-allowed'; 
                    } else if (isAvailable) { 
                        bgColor = '#fffde7 !important'; 
                        dayContent = <Typography variant="caption" component="span" sx={{ fontWeight: 'bold', color: 'success.main', alignSelf: 'center', mt: 'auto' }}>A</Typography>;
                        dateColor = 'text.primary';
                    }
                    
                    if (isToday && !bgColor && !isPastDate) { 
                         bgColor = '#e8f5e9 !important'; 
                         dateColor = 'primary.main';
                    }

                    return (
                        <Box 
                            key={date ? dateString : `blank-${index}`}
                            onClick={() => date && !isHoliday && !isPastDate && !scheduledClassOnDate && handleDateClick(date)}
                            sx={{ 
                                width: 'calc(100% / 7)', 
                                minHeight: '5em',
                                cursor: cellCursor, 
                                borderRight: (index % 7 < 6) ? '1px solid' : 'none',
                                borderBottom: (index < days.length - (days.length % 7)) || (days.length % 7 === 0 && index < days.length - 7) || (days.length % 7 !== 0 && index < days.length) ? '1px solid' : 'none',
                                borderColor: 'divider', 
                                boxSizing: 'border-box',
                                transition: 'background-color 0.15s',
                                '&:hover': (date && !isPastDate && !isHoliday && !scheduledClassOnDate) ? { bgcolor: 'action.hover' } : {},
                                backgroundColor: bgColor,
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
                                    <Typography variant="caption" component="span" sx={{ fontWeight: 'bold' }}>
                                        {date.getDate()}
                                    </Typography>
                                    <Box sx={{ flexGrow: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                         {React.isValidElement(dayContent) ? React.cloneElement(dayContent, { sx: { ...dayContent.props.sx, alignSelf: 'center', mt: 0 } }) : dayContent}
                                    </Box>
                                </Box>
                            ) : null}
                        </Box>
                    );
                    // --- End of pasted logic ---
                })}
            </Box>
        </Paper>
    );
};

export default AvailabilityView; 