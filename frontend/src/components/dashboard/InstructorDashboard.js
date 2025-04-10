import React from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import ScheduleIcon from '@mui/icons-material/Schedule';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        // Use options for a more readable format
        return new Date(dateString).toLocaleDateString(undefined, {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

const InstructorDashboard = ({ scheduledClasses = [] }) => {

    // --- Calculate Dashboard Data ---
    const upcomingClasses = [...scheduledClasses]
        .filter(c => new Date(c.datescheduled) >= new Date()) // Filter for today or future
        .sort((a, b) => new Date(a.datescheduled) - new Date(b.datescheduled)); // Sort by date ascending

    const nextClass = upcomingClasses.length > 0 ? upcomingClasses[0] : null;
    const totalScheduled = scheduledClasses.length; // All scheduled, including past if needed for other counts
    const upcomingCount = upcomingClasses.length;

    // --- Render Logic ---
    return (
        <Box>
            <Grid container spacing={3}>
                {/* Next Class Summary Card */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Typography component="h2" variant="h6" color="primary" gutterBottom>
                            Next Scheduled Class
                        </Typography>
                        {nextClass ? (
                            <Box>
                                <Typography component="p" variant="h5">
                                    {nextClass.coursetypename} ({nextClass.coursenumber})
                                </Typography>
                                <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
                                    {formatDate(nextClass.datescheduled)}
                                </Typography>
                                <Typography component="p" variant="body1">
                                    At: {nextClass.organizationname}
                                </Typography>
                                <Typography component="p" variant="body2">
                                    Location: {nextClass.location}
                                </Typography>
                            </Box>
                        ) : (
                            <Typography sx={{ mt: 2 }}>No upcoming classes scheduled.</Typography>
                        )}
                    </Paper>
                </Grid>

                {/* Quick Counts Card */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Typography 
                            component="h2" 
                            variant="h6" 
                            color="primary" 
                            gutterBottom 
                            sx={{ textAlign: 'center' }}
                        >
                            Overview
                        </Typography>
                        <List dense>
                            <ListItem>
                                <ListItemIcon><ScheduleIcon /></ListItemIcon>
                                <ListItemText primary={`Total Scheduled Classes`} secondary={`${totalScheduled}`} />
                            </ListItem>
                            <ListItem>
                                <ListItemIcon><EventIcon /></ListItemIcon>
                                <ListItemText primary={`Upcoming Classes`} secondary={`${upcomingCount}`} />
                            </ListItem>
                            {/* Add more counts here if needed (e.g., classes pending completion) */}
                        </List>
                    </Paper>
                </Grid>

                {/* Optional: Upcoming Class List */}
                 {upcomingClasses.length > 0 && (
                     <Grid item xs={12}>
                        <Paper sx={{ p: 2 }}>
                            <Typography component="h3" variant="h6" color="primary" gutterBottom>
                                Upcoming Schedule
                            </Typography>
                            <List dense>
                                {upcomingClasses.slice(0, 5).map(cls => ( // Show next 5
                                    <React.Fragment key={cls.courseid}>
                                        <ListItem>
                                            <ListItemText 
                                                primary={`${cls.coursetypename} (${cls.coursenumber}) - ${cls.organizationname}`}
                                                secondary={`${formatDate(cls.datescheduled)} at ${cls.location}`}
                                            />
                                        </ListItem>
                                        <Divider variant="inset" component="li" />
                                     </React.Fragment>
                                ))}
                            </List>
                             {upcomingClasses.length > 5 && (
                                 <Typography variant="caption" sx={{display: 'block', textAlign: 'right', mt: 1}}>
                                     ... and {upcomingClasses.length - 5} more.
                                 </Typography>
                             )}
                        </Paper>
                     </Grid>
                 )}

            </Grid>
        </Box>
    );
};

export default InstructorDashboard; 