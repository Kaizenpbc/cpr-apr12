import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Alert,
    CircularProgress,
    Typography
} from '@mui/material';
// Phone Input Libraries
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css'; // Import default styles

// Initial empty state for a new organization
const initialOrgState = {
    organizationname: '',
    contactname: '',
    contactemail: '',
    contactphone: '', // Store as E.164
    addressstreet: '',
    addresscity: '',
    addressprovince: '',
    addresspostalcode: '',
    ceoname: '',
    ceophone: '', // Store as E.164
    ceoemail: ''
};

function OrganizationDialog({ open, onClose, onSave, organization }) {
    const [orgData, setOrgData] = useState(initialOrgState);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({}); // State for field-specific errors
    const isEditMode = Boolean(organization?.organizationid);

    useEffect(() => {
        // Populate form if editing, otherwise reset
        if (isEditMode && organization) {
            // Map incoming data (lowercase keys) to state (camelCase/lowercase if needed)
            // Assuming backend returns lowercase keys as per schema
            setOrgData({
                organizationname: organization.organizationname || '',
                contactname: organization.contactname || '',
                contactemail: organization.contactemail || '',
                contactphone: organization.contactphone || '', // Already E.164 from DB
                addressstreet: organization.addressstreet || '',
                addresscity: organization.addresscity || '',
                addressprovince: organization.addressprovince || '',
                addresspostalcode: organization.addresspostalcode || '',
                ceoname: organization.ceoname || '',
                ceophone: organization.ceophone || '', // Already E.164 from DB
                ceoemail: organization.ceoemail || ''
            });
        } else {
            setOrgData(initialOrgState);
        }
        setError(''); // Clear general error
        setFieldErrors({}); // Clear field errors when dialog opens/org changes
    }, [organization, isEditMode, open]);

    // Handles both TextField changes and PhoneInput changes
    const handleChange = (name, value) => {
        setOrgData(prevData => ({
            ...prevData,
            [name]: value
        }));
        // Clear specific field error on change
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: false }));
        }
        // Clear general error message when user starts typing
        if (error) {
            setError('');
        }
    };

    const handleSave = async () => {
        setError('');
        setFieldErrors({});

        // --- Client-side validation --- 
        let hasClientError = false;
        const newFieldErrors = {};
        if (!orgData.organizationname.trim()) {
            newFieldErrors.organizationname = "Organization Name is required.";
            hasClientError = true;
        }
        // Validate Phone Numbers (if entered)
        if (orgData.contactphone && !isValidPhoneNumber(orgData.contactphone)) {
            newFieldErrors.contactphone = "Invalid contact phone number.";
            hasClientError = true;
        }
        if (orgData.ceophone && !isValidPhoneNumber(orgData.ceophone)) {
            newFieldErrors.ceophone = "Invalid CEO phone number.";
            hasClientError = true;
        }

        if (hasClientError) {
            setError('Please fix highlighted field(s).');
            setFieldErrors(newFieldErrors);
            return; // Stop submission
        }
        // --- End Client-side validation --- 

        setLoading(true);
        try {
            // Data sent to API already contains numbers potentially in E.164 format from PhoneInput
            // No extra normalization needed here if PhoneInput provides E.164 directly
            const dataToSend = { ...orgData };

            if (isEditMode) {
                // await api.updateOrganization(organization.organizationid, dataToSend);
                 alert('Update functionality not implemented yet.'); // Placeholder
            } else {
                await api.addOrganization(dataToSend);
            }
            onSave(); 
            onClose(); 
        } catch (err) {
            console.error('Save organization error:', err);
            const message = err.message || 'Failed to save organization.';
            setError('Failed to add organization. Please fix highlighted field(s).'); // Set general message
            
            // Attempt to highlight specific field based on error
            const tempFieldErrors = {};
            if (message.toLowerCase().includes('organization with this name already exists')) {
                 tempFieldErrors.organizationname = "Name already exists.";
            }
            // Add more checks for other potential field errors from backend if possible
            
            setFieldErrors(tempFieldErrors);

        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{isEditMode ? 'Edit Organization' : 'Add New Organization'}</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {/* Organization Details */}
                    <Grid xs={12} sm={12}>
                        <TextField
                            name="organizationname"
                            label="Organization Name *"
                            value={orgData.organizationname}
                            onChange={(e) => handleChange('organizationname', e.target.value)}
                            fullWidth required
                            error={Boolean(fieldErrors.organizationname)}
                            helperText={fieldErrors.organizationname || ""}
                        />
                    </Grid>
                    {/* Address */}
                    <Grid xs={12}>
                        <TextField name="addressstreet" label="Street Address" value={orgData.addressstreet} onChange={(e) => handleChange('addressstreet', e.target.value)} fullWidth />
                    </Grid>
                    <Grid xs={12} sm={4}>
                        <TextField name="addresscity" label="City" value={orgData.addresscity} onChange={(e) => handleChange('addresscity', e.target.value)} fullWidth />
                    </Grid>
                    <Grid xs={12} sm={4}>
                        <TextField name="addressprovince" label="Province" value={orgData.addressprovince} onChange={(e) => handleChange('addressprovince', e.target.value)} fullWidth />
                    </Grid>
                    <Grid xs={12} sm={4}>
                        <TextField name="addresspostalcode" label="Postal Code" value={orgData.addresspostalcode} onChange={(e) => handleChange('addresspostalcode', e.target.value)} fullWidth />
                    </Grid>
                    {/* Contact Person */}
                    <Grid xs={12} sm={6}>
                        <TextField name="contactname" label="Contact Name" value={orgData.contactname} onChange={(e) => handleChange('contactname', e.target.value)} fullWidth />
                    </Grid>
                     <Grid xs={12} sm={6}>
                        <PhoneInput
                            placeholder="Enter contact phone"
                            value={orgData.contactphone}
                            onChange={(value) => handleChange('contactphone', value || '')}
                            defaultCountry="CA"
                            international
                            countryCallingCodeEditable={false}
                            limitMaxLength
                            style={{ marginBottom: '0px'}}
                            className={fieldErrors.contactphone ? 'phone-input-error' : ''}
                        />
                         {fieldErrors.contactphone && <Typography color="error" variant="caption">{fieldErrors.contactphone}</Typography>}
                    </Grid>
                    <Grid xs={12} sm={12}>
                        <TextField name="contactemail" label="Contact Email" value={orgData.contactemail} type="email" onChange={(e) => handleChange('contactemail', e.target.value)} fullWidth />
                    </Grid>
                    {/* CEO Details */}
                     <Grid xs={12} sm={6}>
                        <TextField name="ceoname" label="CEO Name" value={orgData.ceoname} onChange={(e) => handleChange('ceoname', e.target.value)} fullWidth />
                    </Grid>
                     <Grid xs={12} sm={6}>
                        <PhoneInput
                            placeholder="Enter CEO phone"
                            value={orgData.ceophone}
                            onChange={(value) => handleChange('ceophone', value || '')}
                            defaultCountry="CA"
                            international
                            countryCallingCodeEditable={false}
                            limitMaxLength
                            style={{ marginBottom: '0px'}}
                            className={fieldErrors.ceophone ? 'phone-input-error' : ''}
                        />
                         {fieldErrors.ceophone && <Typography color="error" variant="caption">{fieldErrors.ceophone}</Typography>}
                    </Grid>
                    <Grid xs={12} sm={12}>
                        <TextField name="ceoemail" label="CEO Email" value={orgData.ceoemail} type="email" onChange={(e) => handleChange('ceoemail', e.target.value)} fullWidth />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px' }}>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Add Organization')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default OrganizationDialog; 