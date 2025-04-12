import React from 'react';
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button
} from '@mui/material';

const CancelCourseDialog = ({ open, onClose, onConfirm, courseNumber, courseId }) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="cancel-dialog-title"
            aria-describedby="cancel-dialog-description"
        >
            <DialogTitle id="cancel-dialog-title">Confirm Cancellation</DialogTitle>
            <DialogContent>
                <DialogContentText id="cancel-dialog-description">
                    Are you sure you want to cancel course:
                    <br />
                    <strong>{courseNumber || 'N/A'} (ID: {courseId || 'N/A'})</strong>?
                    <br />
                    This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    No
                </Button>
                <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
                    Yes, Cancel Course
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CancelCourseDialog; 