import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
    Container,
    Paper,
    Divider,
    CircularProgress,
    Alert,
    Snackbar,
    AppBar,
    Toolbar
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business'; // Org icon
import PeopleIcon from '@mui/icons-material/People'; // Users icon
import BookIcon from '@mui/icons-material/Book'; // Courses icon (placeholder)
import CategoryIcon from '@mui/icons-material/Category'; // Course Types icon
import PriceChangeIcon from '@mui/icons-material/PriceChange'; // Pricing icon
import LogoutIcon from '@mui/icons-material/Logout';
import OrganizationManager from '../admin/OrganizationManager';
import UserManager from '../admin/UserManager'; // Import the manager component
import CourseTypeManager from '../admin/CourseTypeManager'; // Import the manager
import PricingManager from '../admin/PricingManager'; // Import the manager
import PricingRuleManager from '../admin/PricingRuleManager';
// import CourseManager from '../admin/CourseManager'; // To be created

const drawerWidth = 240;

const SuperAdminPortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState('organizations'); // Default view
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const showSnackbar = useCallback((message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    const handleLogout = () => {
        const firstName = user?.FirstName || 'Super Admin';
        const logoutMessage = `Goodbye ${firstName}!`; // Simple message
        showSnackbar(logoutMessage, 'info');

        setTimeout(() => {
            logout();
            navigate('/');
        }, 1500);
    };

    const renderSelectedView = () => {
        switch (selectedView) {
            case 'organizations':
                return <OrganizationManager />;
            case 'users':
                return <UserManager />; // Render the component
            case 'coursetypes':
                 return <CourseTypeManager />;
            case 'pricing':
                 return <PricingManager />;
            default:
                return <Typography>Select a management section</Typography>;
        }
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
                        Super Admin Portal
                    </Typography>
                    <Typography variant="body1" noWrap sx={{ mr: 2 }}>
                         Welcome {user?.FirstName || 'Super Admin'}!
                    </Typography>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto' }}>
                    <List>
                        {/* Organization Management */}
                        <ListItem 
                            component="div"
                            selected={selectedView === 'organizations'}
                            onClick={() => setSelectedView('organizations')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'organizations' ? 'primary.light' : 'transparent',
                                color: selectedView === 'organizations' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'organizations' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'organizations' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}><BusinessIcon /></ListItemIcon>
                            <ListItemText primary="Organizations" />
                        </ListItem>

                        {/* User Management */}
                        <ListItem 
                            component="div"
                            selected={selectedView === 'users'}
                            onClick={() => setSelectedView('users')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'users' ? 'primary.light' : 'transparent',
                                color: selectedView === 'users' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'users' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'users' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}><PeopleIcon /></ListItemIcon>
                            <ListItemText primary="Users" />
                        </ListItem>

                         {/* Course Type Management */}
                         <ListItem 
                            component="div"
                            selected={selectedView === 'coursetypes'}
                            onClick={() => setSelectedView('coursetypes')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'coursetypes' ? 'primary.light' : 'transparent',
                                color: selectedView === 'coursetypes' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'coursetypes' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'coursetypes' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}><CategoryIcon /></ListItemIcon>
                            <ListItemText primary="Course Types" />
                        </ListItem>

                        {/* Pricing Rules Management */}
                         <ListItem 
                            component="div"
                            selected={selectedView === 'pricing'}
                            onClick={() => setSelectedView('pricing')}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                backgroundColor: selectedView === 'pricing' ? 'primary.light' : 'transparent',
                                color: selectedView === 'pricing' ? 'primary.contrastText' : 'inherit',
                                '& .MuiListItemIcon-root': {
                                    color: selectedView === 'pricing' ? 'primary.contrastText' : 'inherit',
                                },
                                '&:hover': {
                                    backgroundColor: selectedView === 'pricing' ? 'primary.main' : 'action.hover',
                                }
                            }}
                        >
                            <ListItemIcon sx={{ color: 'inherit' }}><PriceChangeIcon /></ListItemIcon>
                            <ListItemText primary="Pricing Rules" />
                        </ListItem>

                        <Divider sx={{ my: 1 }} />

                        {/* Logout Item */}
                        <ListItem 
                            component="div"
                            onClick={handleLogout}
                            sx={{ 
                                cursor: 'pointer', 
                                py: 1.5, 
                                '&:hover': { backgroundColor: 'action.hover'} 
                            }}
                        >
                            <ListItemIcon><LogoutIcon /></ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Container maxWidth="xl">
                    {renderSelectedView()}
                </Container>
            </Box>
            
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert /* ... */ >{snackbar.message}</Alert>
            </Snackbar>
        </Box>
    );
};

export default SuperAdminPortal; 