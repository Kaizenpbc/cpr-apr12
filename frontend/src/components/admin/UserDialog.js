import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, Grid, Alert, CircularProgress, Select, MenuItem,
    FormControl, InputLabel, FormHelperText
} from '@mui/material';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// Initial empty state for a new user
const initialUserState = {
    username: '',
    password: '', // Handle password update separately if editing
    role: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '', // Added phone
    organizationId: '' // Store as string initially for Select compatibility
};

// Define allowed roles (fetch from backend ideally, but hardcode for now)
const roles = ['SuperAdmin', 'Admin', 'Instructor', 'Organization', 'Accounting'];

function UserDialog({ open, onClose, onSave, user, existingUsers = [] }) {
    const [userData, setUserData] = useState(initialUserState);
    const [organizations, setOrganizations] = useState([]);
    const [loadingOrgs, setLoadingOrgs] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const isEditMode = Boolean(user?.userid);

    // Fetch organizations for the dropdown if role is Organization
    const fetchOrganizations = useCallback(async () => {
        setLoadingOrgs(true);
        try {
            const data = await api.getOrganizations(); // Use existing API function
            setOrganizations(data || []);
        } catch (fetchErr) {
            console.error("Error fetching organizations for dialog:", fetchErr);
            setError('Could not load organizations list.'); // Show error in dialog
            setOrganizations([]);
        }
        setLoadingOrgs(false);
    }, []);

    useEffect(() => {
        if (open) { // Only fetch when dialog is opened
             fetchOrganizations();
             if (isEditMode && user) {
                 setUserData({
                     username: user.username || '',
                     password: '', // Don't prefill password for edit
                     role: user.role || '',
                     firstName: user.firstname || '',
                     lastName: user.lastname || '',
                     email: user.email || '',
                     phone: user.phone || '', // Add phone
                     organizationId: user.organizationid ? String(user.organizationid) : '' // Convert ID to string for Select
                 });
             } else {
                 setUserData(initialUserState);
             }
             setError('');
             setFieldErrors({});
         } 
    }, [user, isEditMode, open, fetchOrganizations]);

    // Handler for standard MUI TextFields
    const handleTextChange = (event) => {
        const { name, value } = event.target;
        setUserData(prevData => ({
            ...prevData,
            [name]: value
        }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: false }));
        }
        if (error) {
            setError('');
        }
    };

    // Handler specifically for react-phone-number-input
    const handlePhoneChange = (name, value) => {
        setUserData(prevData => ({
            ...prevData,
            // Use the name passed ('phone') and the value directly
            [name]: value || '' // Ensure empty string if value is null/undefined
        }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: false }));
        }
        if (error) {
            setError('');
        }
    };

    const handleSave = async () => {
        setError('');
        setFieldErrors({});
        let hasClientError = false;
        const newFieldErrors = {};

        // --- Client-side validation ---
        // Required fields
        if (!userData.username.trim()) newFieldErrors.username = "Username required";
        if (!isEditMode && !userData.password) newFieldErrors.password = "Password required for new user";
        if (!userData.role) newFieldErrors.role = "Role required";
        if (!userData.firstName.trim()) newFieldErrors.firstName = "First Name required";
        if (!userData.lastName.trim()) newFieldErrors.lastName = "Last Name required";
        if (userData.role === 'Organization' && !userData.organizationId) newFieldErrors.organizationId = "Organization required for this role";
        
        // Phone validation (if entered)
        if (userData.phone && !isValidPhoneNumber(userData.phone)) {
            newFieldErrors.phone = "Invalid phone number.";
        }
        
        // Email format validation (basic)
        if (userData.email && !/\S+@\S+\.\S+/.test(userData.email)) {
            newFieldErrors.email = "Invalid email format.";
        }

        // Check for duplicate username (case-insensitive, ignore self if editing)
        const usernameLower = userData.username.trim().toLowerCase();
        if (usernameLower && existingUsers.some(u => 
            u.username.toLowerCase() === usernameLower && u.userid !== user?.userid
        )) {
            newFieldErrors.username = "Username already taken.";
        }
        
        // Check for duplicate email (case-insensitive, ignore self if editing, allow empty)
        const emailLower = userData.email.trim().toLowerCase();
        if (emailLower && existingUsers.some(u => 
            u.email && u.email.toLowerCase() === emailLower && u.userid !== user?.userid
        )) {
            newFieldErrors.email = "Email already registered.";
        }
        // --- End Client-side validation ---

        if (Object.keys(newFieldErrors).length > 0) {
            setError('Please fix highlighted field(s).');
            setFieldErrors(newFieldErrors);
            return; 
        }

        setLoading(true);
        try {
            // Prepare data for API (convert orgId back to number if set)
            const dataToSend = {
                ...userData,
                organizationId: userData.organizationId ? parseInt(userData.organizationId, 10) : null,
            };
            // Don't send empty password string for updates unless explicitly changing
            if (isEditMode && !dataToSend.password) {
                delete dataToSend.password;
            }

            if (isEditMode) {
                console.log('[UserDialog] Calling updateUser with ID:', user.userid, 'Data:', dataToSend);
                await api.updateUser(user.userid, dataToSend);
            } else {
                console.log('[UserDialog] Calling addUser with Data:', dataToSend);
                await api.addUser(dataToSend);
            }
            console.log('[UserDialog] Save successful, calling onSave and onClose.');
            onSave(); 
            onClose(); 
        } catch (err) {
            console.error('Save user error:', err);
            const message = err.message || 'Failed to save user.';
            setError('Failed to save. Please fix highlighted field(s).'); // Generic error
            
            // Highlight fields based on backend error (redundant with client checks, but good fallback)
            const tempFieldErrors = {};
            if (message.toLowerCase().includes('username already exists')) {
                 tempFieldErrors.username = "Username already exists.";
            } else if (message.toLowerCase().includes('email already exists')) {
                 tempFieldErrors.email = "Email already exists.";
            } else if (message.toLowerCase().includes('invalid organization id')) {
                 tempFieldErrors.organizationId = "Selected organization is invalid.";
            }
            // If backend error wasn't specific, keep client-side errors
            setFieldErrors(prev => ({...prev, ...tempFieldErrors})); 
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={6}>
                        <TextField name="username" label="Username *" value={userData.username} onChange={handleTextChange} fullWidth required error={Boolean(fieldErrors.username)} helperText={fieldErrors.username || ""}/>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField name="password" label={isEditMode ? "New Password (Optional)" : "Password *"} type="password" value={userData.password} onChange={handleTextChange} fullWidth required={!isEditMode} error={Boolean(fieldErrors.password)} helperText={fieldErrors.password || ""}/>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField name="firstName" label="First Name *" value={userData.firstName} onChange={handleTextChange} fullWidth required error={Boolean(fieldErrors.firstName)} helperText={fieldErrors.firstName || ""}/>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField name="lastName" label="Last Name *" value={userData.lastName} onChange={handleTextChange} fullWidth required error={Boolean(fieldErrors.lastName)} helperText={fieldErrors.lastName || ""}/>
                    </Grid>
                     <Grid item xs={12} sm={6}>
                        <TextField name="email" label="Email" type="email" value={userData.email} onChange={handleTextChange} fullWidth error={Boolean(fieldErrors.email)} helperText={fieldErrors.email || ""}/>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={Boolean(fieldErrors.phone)}>
                            <PhoneInput
                                placeholder="Enter phone number"
                                value={userData.phone}
                                onChange={(value) => handlePhoneChange('phone', value)}
                                defaultCountry="CA"
                                international
                                countryCallingCodeEditable={false}
                                limitMaxLength
                                style={{ 
                                    border: fieldErrors.phone ? '1px solid red' : '1px solid #ccc', 
                                    borderRadius: '4px', 
                                    padding: '16.5px 14px' 
                                }}
                                className={fieldErrors.phone ? 'phone-input-error' : ''}
                            />
                            {fieldErrors.phone && <FormHelperText>{fieldErrors.phone}</FormHelperText>}
                        </FormControl>
                    </Grid>
                     <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required error={Boolean(fieldErrors.role)}>
                            <InputLabel id="role-select-label">Role *</InputLabel>
                            <Select name="role" labelId="role-select-label" label="Role *" value={userData.role} onChange={handleTextChange}>
                                {roles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                            </Select>
                            {fieldErrors.role && <FormHelperText>{fieldErrors.role}</FormHelperText>}
                        </FormControl>
                    </Grid>
                   
                    {/* Conditional Organization Dropdown */}
                    {userData.role === 'Organization' && (
                        <Grid item xs={12}>
                            <FormControl fullWidth required error={Boolean(fieldErrors.organizationId)} disabled={loadingOrgs}>
                                <InputLabel id="org-select-label">Organization *</InputLabel>
                                <Select 
                                    name="organizationId"
                                    labelId="org-select-label"
                                    label="Organization *" 
                                    value={userData.organizationId} 
                                    onChange={handleTextChange}
                                >
                                    <MenuItem value=""><em>Select Organization...</em></MenuItem>
                                    {organizations.map(org => (
                                        <MenuItem key={org.organizationid} value={String(org.organizationid)}>
                                            {org.organizationname}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {fieldErrors.organizationId && <FormHelperText>{fieldErrors.organizationId}</FormHelperText>}
                                {loadingOrgs && <FormHelperText>Loading organizations...</FormHelperText>}
                            </FormControl>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Add User')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default UserDialog; 