import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  AdminPanelSettings as AdminIcon,
  AccountBalance as AccountingIcon,
} from '@mui/icons-material';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedPortal, setSelectedPortal] = useState(null);

  const portals = [
    { id: 'instructor', name: 'Instructor Portal', icon: <PersonIcon sx={{ fontSize: 40 }} />, username: 'instructor' },
    { id: 'organization', name: 'Organization Portal', icon: <BusinessIcon sx={{ fontSize: 40 }} />, username: 'orgadmin' },
    { id: 'course-admin', name: 'Course Admin Portal', icon: <AdminIcon sx={{ fontSize: 40 }} />, username: 'courseadmin' },
    { id: 'accounting', name: 'Accounting Portal', icon: <AccountingIcon sx={{ fontSize: 40 }} />, username: 'actadmin' },
  ];

  const handlePortalSelect = (portal) => {
    setSelectedPortal(portal);
    setError('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!selectedPortal) {
      setError('Please select a portal first');
      return;
    }

    if (username === selectedPortal.username && password === 'test123') {
      navigate(`/${selectedPortal.id}`);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <Container component="main" maxWidth="lg">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 800 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            GTA CPR Course Management
          </Typography>
          
          <Typography variant="h6" align="center" color="textSecondary" paragraph>
            Select your portal and login to continue
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {portals.map((portal) => (
              <Grid item xs={12} sm={6} md={3} key={portal.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    border: selectedPortal?.id === portal.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  }}
                >
                  <CardActionArea onClick={() => handlePortalSelect(portal)}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      {portal.icon}
                      <Typography variant="subtitle1" sx={{ mt: 1 }}>
                        {portal.name}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 