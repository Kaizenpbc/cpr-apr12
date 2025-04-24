import React from 'react';
import { Box, Typography, Paper, IconButton, Grid, Container } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { formatDate } from '../../utils/formatters';

const AvailabilityView = ({
    currentDate,
    handlePreviousMonth,
    handleNextMonth,
    availableDates,
    scheduledClasses,
    ontarioHolidays2024,
    handleDateClick
}) => {
    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();

    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();

    const renderCalendarDays = () => {
        const days = [];
        const today = new Date();
        
        // Add empty cells for days before the first of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(
                <Grid item xs={1} key={`empty-${i}`}>
                    <Paper sx={{ p: 1, height: 100, visibility: 'hidden' }} />
                </Grid>
            );
        }

        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
            );
            const dateStr = date.toISOString().split('T')[0];
            
            const isAvailable = availableDates.has(dateStr);
            const isHoliday = ontarioHolidays2024.has(dateStr);
            const hasClass = scheduledClasses.some(
                course => course.datescheduled?.split('T')[0] === dateStr
            );
            
            let backgroundColor = 'white';
            if (isHoliday) {
                backgroundColor = '#ffebee'; // Light red for holidays
            } else if (hasClass) {
                backgroundColor = '#e3f2fd'; // Light blue for classes
            } else if (isAvailable) {
                backgroundColor = '#fff59d'; // Yellow for available dates
            }

            days.push(
                <Grid item xs={1} key={dateStr}>
                    <Paper
                        sx={{
                            p: 1,
                            height: 100,
                            backgroundColor,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            '&:hover': {
                                backgroundColor: '#f5f5f5',
                                transition: 'background-color 0.3s'
                            }
                        }}
                        onClick={() => handleDateClick(date)}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {day}
                        </Typography>
                        {isAvailable && (
                            <Typography 
                                variant="h6" 
                                color="primary"
                                sx={{ 
                                    mt: 'auto',
                                    textAlign: 'center',
                                    fontWeight: 'bold'
                                }}
                            >
                                A
                            </Typography>
                        )}
                        {hasClass && (
                            <Typography 
                                variant="caption" 
                                color="primary"
                                sx={{ mt: 'auto' }}
                            >
                                Class Scheduled
                            </Typography>
                        )}
                        {isHoliday && (
                            <Typography 
                                variant="caption" 
                                color="error"
                                sx={{ mt: 'auto' }}
                            >
                                Holiday
                            </Typography>
                        )}
                    </Paper>
                </Grid>
            );
        }

        // Add empty cells for remaining days to complete the grid
        const totalDays = firstDayOfMonth + daysInMonth;
        const remainingCells = Math.ceil(totalDays / 7) * 7 - totalDays;
        for (let i = 0; i < remainingCells; i++) {
            days.push(
                <Grid item xs={1} key={`empty-end-${i}`}>
                    <Paper sx={{ p: 1, height: 100, visibility: 'hidden' }} />
                </Grid>
            );
        }

        return days;
    };

    return (
        <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ 
                width: '100%',
                maxWidth: '800px',
                p: 3,
                margin: '0 auto'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mb: 3 
                }}>
                    <IconButton onClick={handlePreviousMonth}>
                        <ChevronLeft />
                    </IconButton>
                    <Typography variant="h6" sx={{ mx: 2 }}>
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </Typography>
                    <IconButton onClick={handleNextMonth}>
                        <ChevronRight />
                    </IconButton>
                </Box>

                <Grid container spacing={1.5} columns={7}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <Grid item xs={1} key={day}>
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '40px',
                                borderBottom: '1px solid #e0e0e0'
                            }}>
                                <Typography 
                                    variant="body2" 
                                    sx={{ 
                                        fontWeight: 'bold',
                                        textAlign: 'center'
                                    }}
                                >
                                    {day}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                    {renderCalendarDays()}
                </Grid>
            </Box>
        </Container>
    );
};

export default AvailabilityView; 