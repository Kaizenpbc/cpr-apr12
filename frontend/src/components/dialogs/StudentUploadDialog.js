import React, { useState, useRef } from 'react';
import Papa from 'papaparse'; // Import PapaParse
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Alert,
    List, ListItem, ListItemText, // For preview
    CircularProgress
} from '@mui/material';
import * as api from '../../services/api';

const StudentUploadDialog = ({ open, onClose, courseId, onUploadComplete }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [parsedStudents, setParsedStudents] = useState([]);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null); // Ref to access file input

    // Reset state when dialog closes or file changes
    const resetState = () => {
        setSelectedFile(null);
        setParsedStudents([]);
        setParseError('');
        setUploadError('');
        setIsParsing(false);
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Clear the file input
        }
    };

    const handleClose = () => {
        resetState();
        onClose(); // Call the parent onClose handler
    };

    const handleFileChange = (event) => {
        resetState();
        const file = event.target.files[0];
        if (file && file.type === 'text/csv') {
            setSelectedFile(file);
            parseFile(file);
        } else if (file) {
            setParseError('Invalid file type. Please upload a CSV file.');
        } else {
             setParseError(''); // Clear error if no file selected
        }
    };

    const parseFile = (file) => {
        setIsParsing(true);
        setParseError('');
        Papa.parse(file, {
            header: true, // Assume first row is header
            skipEmptyLines: true,
            complete: (results) => {
                console.log('Parsed CSV:', results);
                // Basic validation of headers and data
                if (!results.meta.fields || !results.meta.fields.includes('FirstName') || !results.meta.fields.includes('LastName')) {
                     setParseError('CSV must contain at least \'FirstName\' and \'LastName\' columns.');
                     setParsedStudents([]);
                } else if (results.data.length === 0) {
                     setParseError('CSV file appears to be empty or has no data rows.');
                     setParsedStudents([]);
                } else {
                    // Map to expected backend format { firstName, lastName, email }
                    const formattedStudents = results.data.map(row => ({
                        firstName: row.FirstName?.trim(),
                        lastName: row.LastName?.trim(),
                        email: row.Email?.trim() || null // Handle optional email
                    })).filter(student => student.firstName && student.lastName); // Filter out rows missing names
                    
                    if (formattedStudents.length === 0) {
                         setParseError('No valid student names found in the CSV data.');
                    }
                    setParsedStudents(formattedStudents);
                }
                setIsParsing(false);
            },
            error: (error) => {
                console.error('CSV Parse Error:', error);
                setParseError(`Error parsing CSV: ${error.message}`);
                setIsParsing(false);
                setParsedStudents([]);
            }
        });
    };

    const handleUpload = async () => {
        if (!parsedStudents || parsedStudents.length === 0 || !courseId) {
            setUploadError('No valid student data to upload or course ID missing.');
            return;
        }
        setIsUploading(true);
        setUploadError('');
        try {
            const response = await api.uploadStudents(courseId, parsedStudents);
            if (response.success) {
                onUploadComplete(response.message); // Notify parent of success
                handleClose(); // Close dialog on success
            } else {
                setUploadError(response.message || 'Upload failed.');
            }
        } catch (err) {
            setUploadError(err.message || 'An error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Upload Student List (CSV)</DialogTitle>
            <DialogContent dividers>
                {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}
                {parseError && <Alert severity="warning" sx={{ mb: 2 }}>{parseError}</Alert>}
                
                <Typography variant="body2" gutterBottom>
                    Select a CSV file with columns: FirstName, LastName, Email (optional).
                    Ensure the first row contains these exact header names.
                </Typography>

                <Button 
                    variant="outlined" 
                    component="label" // Make button act as label for hidden input
                    disabled={isParsing || isUploading}
                    sx={{ my: 2 }}
                >
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose CSV File'}
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        hidden 
                        accept=".csv"
                        onChange={handleFileChange} 
                    />
                </Button>

                {isParsing && <CircularProgress size={24} />} 

                {parsedStudents.length > 0 && (
                    <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <Typography variant="subtitle2">Preview ({parsedStudents.length} students found):</Typography>
                        <List dense disablePadding>
                            {parsedStudents.slice(0, 10).map((student, index) => ( // Show preview of first 10
                                <ListItem disableGutters key={index}>
                                    <ListItemText primary={`${student.firstName} ${student.lastName}`} secondary={student.email || 'No email'} />
                                </ListItem>
                            ))}
                            {parsedStudents.length > 10 && (
                                 <ListItem disableGutters>
                                    <ListItemText secondary={`...and ${parsedStudents.length - 10} more`} />
                                </ListItem>
                            )}
                        </List>
                    </Box>
                )}

            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isUploading}>Cancel</Button>
                <Button 
                    onClick={handleUpload} 
                    variant="contained" 
                    disabled={isUploading || isParsing || parsedStudents.length === 0 || !!parseError}
                >
                    {isUploading ? <CircularProgress size={24} /> : 'Upload List'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default StudentUploadDialog; 