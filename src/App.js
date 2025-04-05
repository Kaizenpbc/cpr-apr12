import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Login from './components/Login';
import InstructorPortal from './components/portals/InstructorPortal';
import OrganizationPortal from './components/portals/OrganizationPortal';
import CourseAdminPortal from './components/portals/CourseAdminPortal';
import AccountingPortal from './components/portals/AccountingPortal';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/instructor" element={<InstructorPortal />} />
          <Route path="/organization" element={<OrganizationPortal />} />
          <Route path="/course-admin" element={<CourseAdminPortal />} />
          <Route path="/accounting" element={<AccountingPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 