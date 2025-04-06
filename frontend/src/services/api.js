import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response) {
            throw error.response.data;
        }
        throw error;
    }
);

export const login = async (username, password) => {
    try {
        console.log('Sending login request:', { username, password });
        const response = await api.post('/auth/login', { username, password });
        console.log('Login response:', response);
        return response;
    } catch (error) {
        console.error('Login error:', error);
        if (error.message) {
            throw new Error(error.message);
        }
        throw new Error('Invalid credentials');
    }
};

export const getCourses = async () => {
    try {
        const response = await api.get('/courses');
        return response;
    } catch (error) {
        throw error;
    }
};

export const getCourseDetails = async (courseId) => {
    try {
        const response = await api.get(`/courses/${courseId}`);
        return response;
    } catch (error) {
        throw error;
    }
};

export const getInstructorSchedule = async (instructorId) => {
    try {
        const response = await api.get(`/instructors/${instructorId}/schedule`);
        return response;
    } catch (error) {
        throw error;
    }
};

export const getOrganizationCourses = async (organizationId) => {
    try {
        const response = await api.get(`/organizations/${organizationId}/courses`);
        return response;
    } catch (error) {
        throw error;
    }
};

// Instructor Availability
export const addAvailability = async (date) => {
    try {
        const responseData = await api.post('/instructor/availability', { date });
        return responseData;
    } catch (error) {
        console.error('Error adding availability:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

export const removeAvailability = async (date) => {
    try {
        const responseData = await api.delete(`/instructor/availability/${date}`);
        return responseData;
    } catch (error) {
        console.error('Error removing availability:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

export const getAvailability = async () => {
    try {
        const datesArray = await api.get('/instructor/availability');
        return datesArray;
    } catch (error) {
        console.error('Error fetching availability:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Scheduled Classes
export const getScheduledClasses = async () => {
    try {
        const classesArray = await api.get('/instructor/classes');
        return classesArray;
    } catch (error) {
        console.error('Error fetching scheduled classes:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

export const scheduleClass = async (classData) => {
    try {
        const response = await api.post('/instructor/classes', classData);
        return response.data;
    } catch (error) {
        console.error('Error scheduling class:', error);
        throw new Error(error.response?.data?.message || 'Failed to schedule class');
    }
};

// Course Types
export const getCourseTypes = async () => {
    try {
        // Assuming the backend route returns { success: true, courseTypes: [...] }
        const response = await api.get('/course-types');
        if (response && response.courseTypes) {
            return response.courseTypes;
        } else {
            console.warn('Unexpected response format for getCourseTypes:', response);
            return [];
        }
    } catch (error) {
        console.error('Error fetching course types:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Request a new Course (Organization)
export const requestCourse = async (courseData) => {
    // courseData should contain: { dateRequested, location, courseTypeId, registeredStudents, notes }
    try {
        const response = await api.post('/courses/request', courseData);
        return response; // Expecting { success: true, message: ..., course: ... }
    } catch (error) {
        console.error('Error requesting course:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Admin: Fetch Instructor Dashboard Data
export const getInstructorDashboard = async () => {
    try {
        const response = await api.get('/admin/instructor-dashboard');
        // Expecting { success: true, data: [...] }
        if (response && response.success) {
            return response.data;
        } else {
            throw new Error(response?.message || 'Failed to fetch instructor dashboard data');
        }
    } catch (error) {
        console.error('Error fetching instructor dashboard:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Admin: Fetch Pending Courses
export const getPendingCourses = async () => {
    try {
        const response = await api.get('/admin/pending-courses');
        if (response && response.success) {
            return response.courses;
        } else {
            throw new Error(response?.message || 'Failed to fetch pending courses');
        }
    } catch (error) {
        console.error('Error fetching pending courses:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Admin: Fetch Scheduled Courses
export const getScheduledCoursesAdmin = async () => {
    try {
        const response = await api.get('/admin/scheduled-courses');
        if (response && response.success) {
            return response.courses;
        } else {
            throw new Error(response?.message || 'Failed to fetch scheduled courses');
        }
    } catch (error) {
        console.error('Error fetching scheduled courses:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Admin: Fetch Completed Courses
export const getCompletedCoursesAdmin = async () => {
    try {
        const response = await api.get('/admin/completed-courses');
        if (response && response.success) {
            return response.courses;
        } else {
            throw new Error(response?.message || 'Failed to fetch completed courses');
        }
    } catch (error) {
        console.error('Error fetching completed courses:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Upload Students for a Course
export const uploadStudents = async (courseId, students) => {
    // students should be an array of { firstName, lastName, email }
    try {
        const response = await api.post(`/courses/${courseId}/students`, { students });
        return response; // Expecting { success: true, message: ... }
    } catch (error) {
        console.error(`Error uploading students for course ${courseId}:`, error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Instructor: Get Today's Classes
export const getTodaysClasses = async () => {
    try {
        const response = await api.get('/instructor/todays-classes');
        if (response && response.success) {
            return response.classes;
        } else {
            throw new Error(response?.message || 'Failed to fetch today\'s classes');
        }
    } catch (error) {
        console.error("Error fetching today's classes:", error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Get Students for a Course
export const getStudentsForCourse = async (courseId) => {
    try {
        const response = await api.get(`/courses/${courseId}/students`);
        if (response && response.success) {
            return response.students;
        } else {
            throw new Error(response?.message || 'Failed to fetch students');
        }
    } catch (error) {
        console.error(`Error fetching students for course ${courseId}:`, error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Instructor: Update Student Attendance
export const updateStudentAttendance = async (studentId, attended) => {
    try {
        const response = await api.put(`/students/${studentId}/attendance`, { attended });
        return response; // Expect { success: true, message: ... }
    } catch (error) {
        console.error(`Error updating attendance for student ${studentId}:`, error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Instructor: Add Student during Attendance
export const addStudentToCourse = async (courseId, studentData) => {
    // studentData = { firstName, lastName, email? }
    try {
        const response = await api.post(`/courses/${courseId}/add-student`, studentData);
        return response; // Expect { success: true, message: ..., student: ... }
    } catch (error) {
        console.error(`Error adding student to course ${courseId}:`, error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Instructor: Mark Course Completed
export const markCourseCompleted = async (courseId) => {
    try {
        const response = await api.put(`/courses/${courseId}/complete`);
        return response; // Expect { success: true, message: ... }
    } catch (error) {
        console.error(`Error completing course ${courseId}:`, error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Instructor: Get Completed Courses (Archive)
export const getInstructorCompletedCourses = async () => {
    try {
        const response = await api.get('/instructor/completed-classes');
        if (response && response.success) {
            return response.courses;
        } else {
            throw new Error(response?.message || 'Failed to fetch completed classes');
        }
    } catch (error) {
        console.error('Error fetching completed classes:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

export default api; 