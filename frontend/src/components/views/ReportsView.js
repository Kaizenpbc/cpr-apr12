import React, { useState } from 'react';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Paper
} from '@mui/material';
import RevenueReport from '../reports/RevenueReport';
import ArAgingReport from '../reports/ArAgingReport';

// Placeholder components for each report type
const ARReport = () => <Paper sx={{p:2, mt: 2}}>AR Aging Report Placeholder</Paper>;
const InstructorWorkloadReport = () => <Paper sx={{p:2, mt: 2}}>Instructor Workload Report Placeholder</Paper>;
const CourseSchedulingReport = () => <Paper sx={{p:2, mt: 2}}>Course Scheduling Report Placeholder</Paper>;

const ReportsView = () => {
    const [selectedReport, setSelectedReport] = useState(0); // Index of the selected tab

    const handleTabChange = (event, newValue) => {
        setSelectedReport(newValue);
    };

    const renderSelectedReport = () => {
        switch (selectedReport) {
            case 0: return <RevenueReport />;
            case 1: return <ArAgingReport />;
            case 2: return <InstructorWorkloadReport />;
            case 3: return <CourseSchedulingReport />;
            default: return <Typography>Select a report type.</Typography>;
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Reports</Typography>
            <Paper square>
                <Tabs
                    value={selectedReport}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable" // Allows more tabs if needed
                    scrollButtons="auto"
                    aria-label="reports tabs"
                >
                    <Tab label="Revenue" />
                    <Tab label="AR Aging" />
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

export default ReportsView; 