import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true // Enable sending cookies
});

// Function to fetch CSRF token
export const fetchCsrfToken = async () => {
    console.log('[API] Fetching CSRF token...');
    try {
        const response = await axios.get(`${API_URL}/csrf-token`, {
            withCredentials: true
        });
        console.log('[API] CSRF token response:', response.data);
        if (!response.data || !response.data.token) {
            throw new Error('Invalid CSRF token response');
        }
        return response.data.token;
    } catch (error) {
        console.error('[API] Error fetching CSRF token:', error);
        throw error;
    }
};

// Add a request interceptor to include the token and CSRF token
api.interceptors.request.use(
    async (config) => {
        const token = localStorage.getItem('token');
        const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrf-token='))
            ?.split('=')[1];

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // For non-GET requests, ensure we have a CSRF token
        if (config.method !== 'get' && !csrfToken) {
            try {
                const newToken = await fetchCsrfToken();
                config.headers['X-CSRF-Token'] = newToken;
            } catch (error) {
                console.error('Failed to get CSRF token:', error);
                return Promise.reject(error);
            }
        } else if (csrfToken) {
            config.headers['X-CSRF-Token'] = csrfToken;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor for potential global error handling
api.interceptors.response.use(
    (response) => {
        const token = response.headers['x-csrf-token'];
        if (token) {
            document.cookie = `csrf-token=${token}; path=/; secure; samesite=strict`;
        }
        return response.data;
    },
    (error) => {
        if (error.response?.status === 403 && error.response?.data?.error === 'CSRF token validation failed') {
            console.error('CSRF token validation failed');
            // Optionally retry the request with a new CSRF token
        }
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error.message || 'An API error occurred');
    }
);

// Update login function to fetch CSRF token first
export const login = async (username, password) => {
    console.log('[API] Starting login process...');
    try {
        console.log('[API] Fetching CSRF token for login...');
        const csrfToken = await fetchCsrfToken();
        console.log('[API] CSRF token obtained:', csrfToken);
        
        const response = await axios.post(`${API_URL}/auth/login`, {
            username,
            password
        }, {
            headers: {
                'X-CSRF-Token': csrfToken
            },
            withCredentials: true
        });
        console.log('[API] Login response:', response.data);
        return response.data;
    } catch (error) {
        console.error('[API] Login error:', error);
        throw error;
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

// Accounting: Get Payments for a specific Invoice
export const getInvoicePayments = async (invoiceId) => {
    console.log(`[API Service] Fetching payments for invoice ${invoiceId}...`);
    try {
        const response = await api.get(`/accounting/invoices/${invoiceId}/payments`);
        // Expects { success: true, payments: [...] }
        if (response.success) {
            return response.payments; // Return the array of payments
        } else {
             throw new Error(response.message || 'Failed to fetch payments via API.');
        }
    } catch (error) {
        console.error(`[API Service] Error fetching payments for invoice ${invoiceId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch payment history on the server.');
    }
};

// Accounting: Record Payment for an Invoice
export const recordInvoicePayment = async (invoiceId, paymentData) => {
    console.log(`[API Service] Recording payment for invoice ${invoiceId}:`, paymentData);
    try {
        // POST request with payment data in the body
        const response = await api.post(`/accounting/invoices/${invoiceId}/payments`, paymentData); 
        // Expect { success: true, message: ..., newStatus: ... }
        return response;
    } catch (error) {
        console.error(`[API Service] Error recording payment for invoice ${invoiceId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to record payment on the server.');
    }
};

// --- Organization Detail View APIs ---

export const getOrganizationDetails = async (orgId) => {
    console.log(`[API Service] Fetching details for organization ${orgId}...`);
    try {
        const response = await api.get(`/accounting/organizations/${orgId}/details`);
        if (response.success) {
            return response.details;
        } else {
            throw new Error(response.message || 'Failed to fetch organization details.');
        }
    } catch (error) {
        console.error(`[API Service] Error fetching details for org ${orgId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch organization details on the server.');
    }
};

export const getOrganizationCoursesAdmin = async (orgId) => {
    console.log(`[API Service] Fetching all courses for organization ${orgId}...`);
    try {
        const response = await api.get(`/accounting/organizations/${orgId}/courses`);
        if (response.success) {
            return response.courses;
        } else {
            throw new Error(response.message || 'Failed to fetch organization courses.');
        }
    } catch (error) {
        console.error(`[API Service] Error fetching courses for org ${orgId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch organization courses on the server.');
    }
};

export const getOrganizationInvoices = async (orgId) => {
    console.log(`[API Service] Fetching invoices for organization ${orgId}...`);
    try {
        const response = await api.get(`/accounting/organizations/${orgId}/invoices`);
        if (response.success) {
            return response.invoices;
        } else {
            throw new Error(response.message || 'Failed to fetch organization invoices.');
        }
    } catch (error) {
        console.error(`[API Service] Error fetching invoices for org ${orgId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch organization invoices on the server.');
    }
};

export const getOrganizationPayments = async (orgId) => {
    console.log(`[API Service] Fetching payments for organization ${orgId}...`);
    try {
        const response = await api.get(`/accounting/organizations/${orgId}/payments`);
        if (response.success) {
            return response.payments;
        } else {
            throw new Error(response.message || 'Failed to fetch organization payments.');
        }
    } catch (error) {
        console.error(`[API Service] Error fetching payments for org ${orgId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch organization payments on the server.');
    }
};

export const getOrganizationFinancialSummary = async (orgId) => {
    console.log(`[API Service] Fetching financial summary for organization ${orgId}...`);
    try {
        const response = await api.get(`/accounting/organizations/${orgId}/financial-summary`);
        if (response.success) {
            return response.summary;
        } else {
            throw new Error(response.message || 'Failed to fetch organization financial summary.');
        }
    } catch (error) {
        console.error(`[API Service] Error fetching summary for org ${orgId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch organization financial summary on the server.');
    }
};

// --- Reports APIs ---

export const getArAgingReport = async () => {
    console.log('[API Service] Fetching AR Aging Report data...');
    try {
        const response = await api.get('/accounting/reports/ar-aging');
        // Expecting { success: true, reportData: { buckets: {...}, grandTotal: ... } }
        if (response && response.success) {
            return response.reportData;
        } else {
            throw new Error(response?.message || 'Failed to fetch AR Aging report data');
        }
    } catch (error) {
        console.error('[API Service] Error fetching AR Aging report:', error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch AR Aging report on the server.');
    }
};

export const getRevenueReport = async (year) => {
    console.log(`[API Service] Fetching Revenue Report data for year ${year}...`);
    try {
        const response = await api.get('/accounting/reports/revenue', { params: { year } });
        if (response && response.success) {
            return response.reportData;
        } else {
            throw new Error(response?.message || 'Failed to fetch Revenue report data');
        }
    } catch (error) {
        console.error('[API Service] Error fetching Revenue report:', error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch Revenue report on the server.');
    }
};

// Admin Reports
export const getInstructorWorkloadReport = async (startDate, endDate) => {
    console.log(`[API Service] Fetching Instructor Workload Report data: ${startDate} - ${endDate}`);
    try {
        const response = await api.get('/admin/reports/instructor-workload', { 
            params: { startDate, endDate } 
        });
        if (response && response.success) {
            return response.reportData;
        } else {
            throw new Error(response?.message || 'Failed to fetch Instructor Workload report data');
        }
    } catch (error) {
        console.error('[API Service] Error fetching Instructor Workload report:', error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch Instructor Workload report on the server.');
    }
};

// TODO: Add getCourseSchedulingReport later

// === SuperAdmin Functions ===
// ...

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

// Update Organization (SuperAdmin)
export const updateOrganization = async (id, orgData) => {
    console.log(`[API Service] Updating organization ${id}:`, orgData);
    try {
        const response = await api.put(`/organizations/${id}`, orgData);
        if (response && response.success) {
            return response.organization; // Return the updated org object
        } else {
            throw new Error(response?.message || 'Failed to update organization');
        }
    } catch (error) {
        console.error(`[API Service] Error updating organization ${id}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to update organization on the server.');
    }
};

// Add getOrganizationById, deleteOrganization later

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

// Update User (SuperAdmin)
export const updateUser = async (id, userData) => {
    console.log(`[API Service] Updating user ${id}:`, userData);
    try {
        const response = await api.put(`/users/${id}`, userData);
        if (response && response.success) {
            return response.user; // Return the updated user object
        } else {
            // Throw the specific error message from backend if available
            throw new Error(response?.message || 'Failed to update user');
        }
    } catch (error) {
        console.error(`[API Service] Error updating user ${id}:`, error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to update user on the server.');
    }
};

// Add getUserById, deleteUser later

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

// Admin: Get Instructor Workload Summary
export const getInstructorWorkloads = async () => {
    console.log('[API Service] Fetching instructor workload summary...');
    try {
        const response = await api.get('/admin/instructor-workload');
        // Expecting { success: true, workload: [...] }
        if (response && response.success) {
            return response.workload;
        } else {
            throw new Error(response?.message || 'Failed to fetch workload data');
        }
    } catch (error) {
        console.error('[API Service] Error fetching instructor workload:', error);
        if (error instanceof Error) throw error;
        throw new Error('Failed to fetch instructor workload on the server.');
    }
};

export const resetPassword = async (token, newPassword) => {
  try {
    const response = await axios.post(`${API_URL}/auth/reset-password`, {
      token,
      newPassword
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to reset password');
  }
};

export const requestPasswordReset = async (email) => {
  try {
    const response = await fetch(`${API_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to request password reset');
    }

    return await response.json();
  } catch (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }
};

export default api; 