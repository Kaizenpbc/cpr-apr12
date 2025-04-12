import React from 'react';
import {
    Box, Typography, Button, Select, MenuItem, FormControl, InputLabel,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, Paper, Alert, CircularProgress
} from '@mui/material';

// Receives state and handlers as props
const AttendanceView = ({
    scheduledClasses,
    classToManage,
    handleClassChange,
    studentsForAttendance,
    handleAttendanceChange,
    isLoadingStudents,
    studentsError,
    handleMarkCompleteClick
}) => {

    return (
        <Paper sx={{ p: 2 }}>
             <Typography variant="h6" gutterBottom>Manage Attendance</Typography>
             
             {/* Course Selection Dropdown */}
             <FormControl fullWidth margin="normal" disabled={scheduledClasses.length === 0}>
                <InputLabel id="class-select-label">Select Class</InputLabel>
                <Select
                    labelId="class-select-label"
                    value={classToManage ? classToManage.courseid : ''}
                    label="Select Class"
                    onChange={handleClassChange}
                >
                     <MenuItem value="" disabled><em>Select a scheduled class...</em></MenuItem>
                     {scheduledClasses.map((course) => (
                         <MenuItem key={course.courseid} value={course.courseid}>
                             {`${course.coursetypename} - ${course.organizationname} (${new Date(course.datescheduled).toLocaleDateString()})`}
                         </MenuItem>
                     ))}
                </Select>
             </FormControl>

            {/* Student Table (if class selected) */}
            {classToManage && (
                 isLoadingStudents ? (
                    <CircularProgress sx={{ mt: 2 }} />
                ) : studentsError ? (
                    <Alert severity="error" sx={{ mt: 2 }}>{studentsError}</Alert>
                ) : (
                    <Box mt={2}>
                         <TableContainer component={Paper} variant="outlined">
                             <Table size="small">
                                 <TableHead>
                                     <TableRow>
                                         <TableCell sx={{ fontWeight: 'bold' }}>Student Name</TableCell>
                                         <TableCell sx={{ fontWeight: 'bold' }}>Attended?</TableCell>
                                     </TableRow>
                                 </TableHead>
                                 <TableBody>
                                     {studentsForAttendance.length === 0 ? (
                                         <TableRow><TableCell colSpan={2} align="center">No students registered for this class.</TableCell></TableRow>
                                     ) : (
                                         studentsForAttendance.map((student) => (
                                             <TableRow key={student.studentid}>
                                                 <TableCell>{`${student.firstname || ''} ${student.lastname || ''}`.trim()}</TableCell>
                                                 <TableCell>
                                                     <Checkbox 
                                                         checked={student.attendance || false}
                                                         onChange={(e) => handleAttendanceChange(student.studentid, e.target.checked)}
                                                     />
                                                 </TableCell>
                                             </TableRow>
                                         ))
                                     )}
                                 </TableBody>
                             </Table>
                         </TableContainer>
                         <Button 
                             variant="contained" 
                             color="primary" 
                             sx={{ mt: 2 }}
                             onClick={handleMarkCompleteClick}
                             disabled={!classToManage || studentsForAttendance.length === 0} // Disable if no class or no students
                         >
                             Mark Class as Completed
                         </Button>
                    </Box>
                 )
             )}
        </Paper>
    );
};

export default AttendanceView; 