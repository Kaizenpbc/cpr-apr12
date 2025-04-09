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
    console.log('[API Service] Sending login request:', { username, password: '********' }); // Hide password from log
    try {
        const response = await api.post('/auth/login', { username, password });
        console.log('[API Service] Raw login response received from backend:', response);
        if (response && response.user) {
             console.log('[API Service] User object received within response:', response.user);
        } else {
             console.warn('[API Service] User object MISSING in login response!');
        }
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
    console.log('[API Service] Fetching all course types...');
    try {
        // Re-using authenticateToken logic implicitly via api instance
        const response = await api.get('/course-types');
        if (response && response.success) {
            return response.courseTypes;
        } else {
            // Handle potential case where API returns success:false
            throw new Error(response?.message || 'Failed to fetch course types');
        }
    } catch (error) {
        console.error('[API Service] Error fetching course types:', error);
        // Ensure error object is thrown if it already is one
        if (error instanceof Error) throw error; 
        // Otherwise create a new one
        throw new Error('Failed to fetch course types on the server.');
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

// Admin: Get All Instructors
export const getAllInstructors = async () => {
    try {
        const response = await api.get('/admin/instructors');
        if (response && response.success) {
            return response.instructors;
        } else {
            throw new Error(response?.message || 'Failed to fetch instructors');
        }
    } catch (error) {
        console.error('Error fetching instructors:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Admin: Schedule a Course
export const scheduleCourseAdmin = async (courseId, scheduleData) => {
    // scheduleData = { instructorId, dateScheduled }
    try {
        const response = await api.put(`/admin/schedule-course/${courseId}`, scheduleData);
        return response; // Expect { success: true, message: ..., course: ... }
    } catch (error) {
        console.error(`Error scheduling course ${courseId}:`, error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Admin: Mark course ready for billing
export const markCourseReadyForBilling = async (courseId) => {
    console.log(`[API Service] Marking course ${courseId} ready for billing...`);
    try {
        // Corrected URL path: Removed '/admin'
        const response = await api.put(`/courses/${courseId}/ready-for-billing`); 
        return response; // Expect { success: true, message: ... }
    } catch (error) {
        console.error(`[API Service] Error marking course ${courseId} ready for billing:`, error);
        // Rethrow specific error from backend if available
        if (error instanceof Error) throw error; 
        // Otherwise throw generic
        throw new Error('Failed to mark course ready for billing on the server.');
    }
};

// Accounting: Get billing queue
export const getBillingQueue = async () => {
    try {
        const response = await api.get('/accounting/billing-queue');
        if (response && response.success) {
            return response.courses;
        } else {
            throw new Error(response?.message || 'Failed to fetch billing queue');
        }
    } catch (error) {
        console.error('Error fetching billing queue:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Accounting: Create Invoice
export const createInvoice = async (courseId) => {
    try {
        // No body needed, backend calculates amount based on courseId
        const response = await api.post(`/accounting/create-invoice/${courseId}`);
        return response; // Expect { success: true, message: ..., invoice: ... }
    } catch (error) {
        console.error(`Error creating invoice for course ${courseId}:`, error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Accounting: Get All Invoices
export const getInvoices = async () => {
    try {
        const response = await api.get('/accounting/invoices');
        if (response && response.success) {
            return response.invoices;
        } else {
            throw new Error(response?.message || 'Failed to fetch invoices');
        }
    } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

// Accounting: Get Invoice Details
export const getInvoiceDetails = async (invoiceId) => {
    console.log(`[API Service] Fetching details for invoice ${invoiceId}...`);
    try {
        const response = await api.get(`/accounting/invoices/${invoiceId}`);
        // Backend already returns { success: true, invoice: {...} }
        return response;
    } catch (error) {
        console.error(`[API Service] Error fetching invoice details ${invoiceId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch invoice details on the server.');
    }
};

// Accounting: Email Invoice
export const emailInvoice = async (invoiceId) => {
    console.log(`[API Service] Requesting email for invoice ${invoiceId}...`);
    try {
        // POST request, no body needed as invoiceId is in URL
        const response = await api.post(`/accounting/invoices/${invoiceId}/email`); 
        // Expect { success: true, message: ..., previewUrl?: ... }
        return response;
    } catch (error) {
        console.error(`[API Service] Error emailing invoice ${invoiceId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to trigger invoice email on the server.');
    }
};

// === NEW SuperAdmin Functions ===

// --- Organization Management (SuperAdmin) ---
export const getOrganizations = async () => {
    console.log('[API Service] Fetching all organizations...');
    try {
        // Assumes API interceptor adds the token (Bearer 5 for superadmin)
        const response = await api.get('/organizations');
        if (response && response.success) {
            return response.organizations;
        } else {
            throw new Error(response?.message || 'Failed to fetch organizations');
        }
    } catch (error) {
        console.error('[API Service] Error fetching organizations:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

export const addOrganization = async (orgData) => {
    console.log('[API Service] Adding new organization:', orgData);
    try {
        // Assumes API interceptor adds the token
        const response = await api.post('/organizations', orgData);
        if (response && response.success) {
            return response.organization; // Return the newly created org object
        } else {
            throw new Error(response?.message || 'Failed to add organization');
        }
    } catch (error) {
        console.error('[API Service] Error adding organization:', error);
        // Rethrow specific validation errors if possible
        if (error instanceof Error) throw error;
        // Otherwise throw generic
        throw new Error('Failed to add organization on the server.');
    }
};

// Add getOrganizationById, updateOrganization, deleteOrganization later

// --- User Management (SuperAdmin) ---
export const getUsers = async () => {
    console.log('[API Service] Fetching all users...');
    try {
        // Assumes API interceptor adds the token
        const response = await api.get('/users');
        if (response && response.success) {
            return response.users;
        } else {
            throw new Error(response?.message || 'Failed to fetch users');
        }
    } catch (error) {
        console.error('[API Service] Error fetching users:', error);
        throw error?.message ? new Error(error.message) : error;
    }
};

export const addUser = async (userData) => {
    console.log('[API Service] Adding new user:', userData);
    try {
        // Assumes API interceptor adds the token
        const response = await api.post('/users', userData);
        if (response && response.success) {
            return response.user; // Return the newly created user object
        } else {
            // Throw the specific error message from backend if available
            throw new Error(response?.message || 'Failed to add user');
        }
    } catch (error) {
        console.error('[API Service] Error adding user:', error);
        // Rethrow specific validation errors if possible
        if (error instanceof Error) throw error;
        // Otherwise throw generic
        throw new Error('Failed to add user on the server.');
    }
};

// Add getUserById, updateUser, deleteUser later

export const deleteUser = async (id) => {
    console.log(`[API Service] Deleting user ${id}...`);
    try {
        // Assumes interceptor adds SuperAdmin token
        const response = await api.delete(`/users/${id}`); 
        if (response && response.success) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error(`[API Service] Error deleting user ${id}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to delete user on the server.');
    }
};

// --- Course Type Management (SuperAdmin) ---
export const addCourseType = async (courseTypeData) => {
    console.log('[API Service] Adding new course type:', courseTypeData);
    try {
        const response = await api.post('/course-types', courseTypeData);
        if (response && response.success) {
            return response.courseType;
        } else {
            throw new Error(response?.message || 'Failed to add course type');
        }
    } catch (error) {
        console.error('[API Service] Error adding course type:', error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to add course type on the server.');
    }
};

export const updateCourseType = async (id, courseTypeData) => {
    console.log(`[API Service] Updating course type ${id}:`, courseTypeData);
    try {
        const response = await api.put(`/course-types/${id}`, courseTypeData);
        if (response && response.success) {
            return response.courseType;
        } else {
            throw new Error(response?.message || 'Failed to update course type');
        }
    } catch (error) {
        console.error(`[API Service] Error updating course type ${id}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to update course type on the server.');
    }
};

export const deleteCourseType = async (id) => {
    console.log(`[API Service] Deleting course type ${id}...`);
    try {
        const response = await api.delete(`/course-types/${id}`);
        if (response && response.success) {
            return response; // Return success message etc.
        } else {
            throw new Error(response?.message || 'Failed to delete course type');
        }
    } catch (error) {
        console.error(`[API Service] Error deleting course type ${id}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to delete course type on the server.');
    }
};

// --- Pricing Rule Management (SuperAdmin) ---
export const getPricingRules = async () => {
    console.log('[API Service] Fetching all pricing rules...');
    try {
        const response = await api.get('/pricing-rules');
        if (response && response.success) {
            return response.pricingRules;
        } else {
            throw new Error(response?.message || 'Failed to fetch pricing rules');
        }
    } catch (error) {
        console.error('[API Service] Error fetching pricing rules:', error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch pricing rules on the server.');
    }
};

export const addPricingRule = async (pricingData) => {
    console.log('[API Service] Adding new pricing rule:', pricingData);
    try {
        const response = await api.post('/pricing-rules', pricingData);
        if (response && response.success) {
            return response.pricingRule;
        } else {
            throw new Error(response?.message || 'Failed to add pricing rule');
        }
    } catch (error) {
        console.error('[API Service] Error adding pricing rule:', error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to add pricing rule on the server.');
    }
};

export const updatePricingRule = async (id, price) => {
    // API currently only supports updating the price for a given rule ID
    console.log(`[API Service] Updating pricing rule ${id}:`, { price });
    try {
        const response = await api.put(`/pricing-rules/${id}`, { price }); // Send only price
        if (response && response.success) {
            return response.pricingRule;
        } else {
            throw new Error(response?.message || 'Failed to update pricing rule');
        }
    } catch (error) {
        console.error(`[API Service] Error updating pricing rule ${id}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to update pricing rule on the server.');
    }
};

export const deletePricingRule = async (id) => {
    console.log(`[API Service] Deleting pricing rule ${id}...`);
    try {
        const response = await api.delete(`/pricing-rules/${id}`);
        if (response && response.success) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to delete pricing rule');
        }
    } catch (error) {
        console.error(`[API Service] Error deleting pricing rule ${id}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to delete pricing rule on the server.');
    }
};

// --- Course Actions (Admin) ---
export const cancelCourse = async (courseId) => {
    console.log(`[API Service] Cancelling course ${courseId}...`);
    try {
        // Assumes interceptor adds Admin/SuperAdmin token
        const response = await api.put(`/courses/${courseId}/cancel`); 
        if (response && response.success) {
            return response; // Return success message
        } else {
            throw new Error(response?.message || 'Failed to cancel course');
        }
    } catch (error) {
        console.error(`[API Service] Error cancelling course ${courseId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to cancel course on the server.');
    }
};

export default api; 