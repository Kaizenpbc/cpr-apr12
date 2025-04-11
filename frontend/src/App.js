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
import SuperAdminPortal from './components/portals/SuperAdminPortal';
import OrganizationDetailPage from './pages/OrganizationDetailPage';

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
            <Route path="/login" element={<Login />} />
            <Route
              path="/Instructor/*"
              element={
                <PrivateRoute allowedRoles={['Instructor']}>
                  <InstructorPortal />
                </PrivateRoute>
              }
            />
            <Route
              path="/Organization/*"
              element={
                <PrivateRoute allowedRoles={['Organization']}>
                  <OrganizationPortal />
                </PrivateRoute>
              }
            />
            <Route
              path="/Admin/*"
              element={
                <PrivateRoute allowedRoles={['Admin', 'SuperAdmin']}>
                  <CourseAdminPortal />
                </PrivateRoute>
              }
            />
            <Route
              path="/Accounting/*"
              element={
                <PrivateRoute allowedRoles={['Accounting', 'SuperAdmin']}>
                  <AccountingPortal />
                </PrivateRoute>
              }
            />
            <Route
              path="/accounting/organizations/:orgId"
              element={
                <PrivateRoute allowedRoles={['Accounting', 'SuperAdmin']}>
                  <OrganizationDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/SuperAdmin/*"
              element={
                <PrivateRoute allowedRoles={['SuperAdmin']}>
                  <SuperAdminPortal />
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
