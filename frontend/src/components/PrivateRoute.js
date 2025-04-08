import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Container, Typography } from '@mui/material'; // For Forbidden message

const PrivateRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) {
        // Not logged in, redirect to login page, preserving the intended location
        console.log('[PrivateRoute] No user found, redirecting to login.');
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Check if the user's role is allowed for this route
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Logged in, but incorrect role
        console.warn(`[PrivateRoute] Forbidden access attempt by user ${user.userid} (Role: ${user.role}) to route requiring roles: ${allowedRoles.join(', ')}`);
        // Option 1: Redirect to login
        // return <Navigate to="/" replace />;
        
        // Option 2: Show a Forbidden message/page
        return (
            <Container sx={{mt: 5}}>
                <Alert severity="error">
                    <Typography variant="h6">Access Denied</Typography>
                    You do not have permission to access this page.
                </Alert>
            </Container>
        );
    }

    // User is logged in AND has the correct role (or no specific roles were required)
    return children;
};

export default PrivateRoute; 