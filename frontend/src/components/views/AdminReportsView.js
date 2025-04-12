import React, { useState } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper
} from '@mui/material';

// Import real components
import InstructorWorkloadReport from '../reports/InstructorWorkloadReport'; // Adjust path

// Placeholder components for each report type
// TODO: Import real components when created
const CourseSchedulingReport = () => <Paper sx={{p:2, mt: 2}}>Course Scheduling Report Placeholder</Paper>;

const AdminReportsView = () => {
    const [selectedReport, setSelectedReport] = useState(0); // Index of the selected tab

    const handleTabChange = (event, newValue) => {
        setSelectedReport(newValue);
    };

    const renderSelectedReport = () => {
        switch (selectedReport) {
            case 0: return <InstructorWorkloadReport />; // Use real component
            case 1: return <CourseSchedulingReport />;
            default: return <Typography>Select a report type.</Typography>;
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Admin Reports</Typography>
            <Paper square>
                <Tabs
                    value={selectedReport}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable" 
                    scrollButtons="auto"
                    aria-label="admin reports tabs"
                >
                    <Tab label="Instructor Workload" />
                    <Tab label="Course Scheduling" />
                    {/* Add more tabs here */}
                </Tabs>
            </Paper>

            {/* Render the content of the selected report tab */}
            {renderSelectedReport()}

        </Box>
    );
};

export default AdminReportsView; 