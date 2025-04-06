import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
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
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route
              path="/Instructor/*"
              element={
                <PrivateRoute>
                  <InstructorPortal />
                </PrivateRoute>
              }
            />
            <Route
              path="/Organization/*"
              element={
                <PrivateRoute>
                  <OrganizationPortal />
                </PrivateRoute>
              }
            />
            <Route
              path="/Admin/*"
              element={
                <PrivateRoute>
                  <CourseAdminPortal />
                </PrivateRoute>
              }
            />
            <Route
              path="/Accounting/*"
              element={
                <PrivateRoute>
                  <AccountingPortal />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
