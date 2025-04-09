import React, { useState } from 'react';
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
    Divider
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
// import CourseManager from '../admin/CourseManager'; // To be created

const drawerWidth = 240;

function SuperAdminPortal() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [selectedView, setSelectedView] = useState('organizations'); // Default view

    const handleLogout = () => {
        logout();
        navigate('/');
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
                <Box sx={{ overflow: 'auto', mt: 8 }}> {/* Adjust mt for potential header */}
                    <List>
                        {/* Organization Management */}
                        <ListItem
                            component="div"
                            selected={selectedView === 'organizations'}
                            onClick={() => setSelectedView('organizations')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><BusinessIcon /></ListItemIcon>
                            <ListItemText primary="Organizations" />
                        </ListItem>

                        {/* User Management */}
                        <ListItem
                            component="div"
                            selected={selectedView === 'users'}
                            onClick={() => setSelectedView('users')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><PeopleIcon /></ListItemIcon>
                            <ListItemText primary="Users" />
                        </ListItem>

                         {/* Course Type Management */}
                         <ListItem
                            component="div"
                            selected={selectedView === 'coursetypes'}
                            onClick={() => setSelectedView('coursetypes')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><CategoryIcon /></ListItemIcon>
                            <ListItemText primary="Course Types" />
                        </ListItem>

                        {/* Pricing Rules Management */}
                         <ListItem
                            component="div"
                            selected={selectedView === 'pricing'}
                            onClick={() => setSelectedView('pricing')}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><PriceChangeIcon /></ListItemIcon>
                            <ListItemText primary="Pricing Rules" />
                        </ListItem>

                        <Divider sx={{ my: 1 }} />

                        {/* Logout Item */}
                        <ListItem
                            component="div"
                            onClick={handleLogout}
                            sx={{ cursor: 'pointer' }}
                        >
                            <ListItemIcon><LogoutIcon /></ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItem>
                    </List>
                </Box>
            </Drawer>

            <Box component="main" sx={{ flexGrow: 1, pt: 3, pr: 3, pb: 3, pl: 2, mt: 8 }}>
                 <Container>
                     <Typography variant="h4" gutterBottom>
                         Master Admin Portal
                     </Typography>
                    {/* Render the selected view based on state */}
                    {renderSelectedView()}
                 </Container>
            </Box>
        </Box>
    );
}

export default SuperAdminPortal; 