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
    Card,
    CardContent,
    CardActionArea,
    Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    Person as PersonIcon,
    Business as BusinessIcon,
    AdminPanelSettings as AdminIcon,
    AccountBalance as AccountingIcon,
} from '@mui/icons-material';

const portalOptions = [
    { id: 'Instructor', name: 'Instructor Portal', icon: PersonIcon, username: 'instructor' },
    { id: 'Organization', name: 'Organization Portal', icon: BusinessIcon, username: 'orgadmin' },
    { id: 'Admin', name: 'Course Admin Portal', icon: AdminIcon, username: 'courseadmin' },
    { id: 'Accounting', name: 'Accounting Portal', icon: AccountingIcon, username: 'actadmin' },
];

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [selectedPortal, setSelectedPortal] = useState(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handlePortalSelect = (portal) => {
        setSelectedPortal(portal);
        setUsername(portal.username); // Pre-fill username based on selected portal
        setError('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!selectedPortal || !username || !password) {
            setError('Please select a portal and enter your credentials');
            return;
        }

        try {
            const response = await api.login(username, password);
            if (response.success) {
                // Store both user data and token
                login(response.user, response.token);
                // Navigate to the appropriate portal
                navigate(`/${selectedPortal.id}`);
            }
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message || 'Invalid credentials');
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, mb: 4 }}>
                <Typography variant="h4" component="h1" align="center" gutterBottom>
                    Welcome to CPR Course Management
                </Typography>
                <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
                    Please select your portal and enter your credentials to continue
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ p: 4 }}>
                <Grid container spacing={3}>
                    {portalOptions.map((portal) => (
                        <Grid key={portal.id} xs={6}>
                            <Card 
                                sx={{ 
                                    height: '100%',
                                    bgcolor: selectedPortal?.id === portal.id ? 'primary.light' : 'background.paper',
                                    color: selectedPortal?.id === portal.id ? 'primary.contrastText' : 'text.primary'
                                }}
                            >
                                <CardActionArea onClick={() => handlePortalSelect(portal)}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <portal.icon sx={{ fontSize: 40 }} />
                                            <Typography variant="h6" component="div" align="center">
                                                {portal.name}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {selectedPortal && (
                    <Box component="form" onSubmit={handleLogin} sx={{ mt: 4 }}>
                        <Grid container spacing={2}>
                            <Grid xs={12}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </Grid>
                            <Grid xs={12}>
                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </Grid>
                            <Grid xs={12}>
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                >
                                    Login to {selectedPortal.name}
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </Paper>
        </Container>
    );
};

export default Login; 