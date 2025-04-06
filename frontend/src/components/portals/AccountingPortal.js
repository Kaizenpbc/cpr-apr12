import React from 'react';
import { Container, Typography, Paper, Grid, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const AccountingPortal = () => {
    const { user, logout } = useAuth();

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Grid container spacing={3}>
                <Grid xs={12}>
                    <Paper sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h4" component="h1">
                            Welcome, {user?.FirstName} {user?.LastName}
                        </Typography>
                        <Button variant="contained" color="primary" onClick={logout}>
                            Logout
                        </Button>
                    </Paper>
                </Grid>
                <Grid xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="body1">
                            Accounting functionality coming soon...
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default AccountingPortal; 