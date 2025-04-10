import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    Grid,
    Avatar,
    CssBaseline,
    ThemeProvider,
    createTheme
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
// Removed icon imports and portalOptions

function Copyright(props) {
    // ... copyright component ...
}

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    // Removed selectedPortal state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Removed handlePortalSelect function

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        if (!username || !password) {
            setError('Please enter username and password');
            return;
        }

        try {
            const response = await api.login(username, password);
            if (response.success && response.user) {
                login(response.user, response.token);

                // Navigate based on user role
                const role = response.user.role;
                let path = '';
                switch (role) {
                    case 'SuperAdmin':
                        path = '/SuperAdmin';
                        break;
                    case 'Admin':
                        path = '/Admin';
                        break;
                    case 'Instructor':
                        path = '/Instructor';
                        break;
                    case 'Organization':
                        path = '/Organization';
                        break;
                    case 'Accounting':
                        path = '/Accounting';
                        break;
                    default:
                        console.error('Unrecognized user role:', role);
                        setError('Login successful, but role unrecognized.');
                        // Stay on login or navigate to a default page?
                        return; // Prevent navigation if role unknown
                }
                console.log(`Login successful for role ${role}, navigating to ${path}`);
                navigate(path);

            } else {
                // Handle case where API call succeeded but login failed (e.g., invalid credentials)
                setError(response.message || 'Invalid credentials');
            }
        } catch (err) {
            // Handle API call errors (network error, server error)
            console.error('Login API call error:', err);
            // Use error message from API if available, otherwise generic message
            setError(err.message || 'Login failed. Please try again.');
        }
    };

    return (
        <ThemeProvider theme={createTheme()}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Box 
                        component="img"
                        sx={{
                            m: 1, 
                            height: 64, // Adjust height as needed
                            // maxWidth: '80%' // Optional: constrain width
                        }}
                        alt="GTA CPR Logo"
                        src="https://www.gtacpr.com/wp-content/uploads/2023/02/GTACPR_Logo_GetCertified_Tagline-Black.svg"
                    />
                    <Typography component="h1" variant="h5">
                        GTA CPR Course Management
                    </Typography>
                    <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {/* Optional: Add Remember Me checkbox if needed */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Sign In
                        </Button>
                        {/* Optional: Add Forgot Password or Sign Up links if needed */}
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                            {error}
                        </Alert>
                    )}
                </Box>
            </Container>
        </ThemeProvider>
    );
};

export default Login; 