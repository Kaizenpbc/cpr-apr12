import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Container, Typography, Box, CircularProgress } from '@mui/material'; // For Forbidden message and loading indicator

const PrivateRoute = ({ children, allowedRoles }) => {
    const { user, isLoading, token } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // Show a loading indicator while auth state is being determined
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // After loading, check authentication and authorization
    if (!user || !token) { // Check for user object AND token
        console.log('[PrivateRoute] No user or token found, redirecting to login.');
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if the user's role is included in the allowedRoles for this route
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.log(`[PrivateRoute] Role mismatch: User role '${user.role}' not in allowed roles [${allowedRoles.join(', ')}]`);
        // Redirect to login or a specific unauthorized page
        // For simplicity, redirecting to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If authenticated and authorized, render the child component
    return children;
};

export default PrivateRoute; 