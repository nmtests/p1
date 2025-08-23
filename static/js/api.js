// static/js/api.js
// =================================================================
// Handles all communication with the backend API.
// Manages JWT token for authenticated requests.
// =================================================================

const API_BASE_URL = "/api"; // Using a relative URL

const api = {
    // --- Token Management ---
    setToken(token) {
        localStorage.setItem('jwt_token', token);
    },
    getToken() {
        return localStorage.getItem('jwt_token');
    },
    removeToken() {
        localStorage.removeItem('jwt_token');
    },
    getUserFromToken() {
        const token = this.getToken();
        if (!token) return null;
        try {
            // Decode the payload part of the token
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub; // 'sub' is the standard key for subject/identity
        } catch (error) {
            console.error("Failed to decode token:", error);
            this.removeToken();
            return null;
        }
    },

    // --- Core API Call Function ---
    async call(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                // If the token is expired or invalid, log the user out
                if (response.status === 401 || response.status === 422) {
                    this.removeToken();
                    // We'll reload the page to reset the state
                    window.location.reload();
                }
                // Throw an error with the message from the backend
                throw new Error(data.message || `Error: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API call failed: ${method} ${endpoint}`, error);
            // Re-throw the error so it can be caught by the caller
            throw error;
        }
    },

    // --- Authentication Endpoints ---
    studentLogin: (className, roll, pin) => api.call('/auth/student/login', 'POST', { className, roll, pin }),
    adminLogin: (adminId, password) => api.call('/auth/admin/login', 'POST', { adminId, password }),

    // --- Student Endpoints ---
    getStudentDashboard: () => api.call('/student/dashboard-data'),
    getQuizDetails: (quizId) => api.call(`/student/quiz-details/${quizId}`),
    submitQuiz: (payload) => api.call('/student/submit-quiz', 'POST', payload),
    getReviewDetails: (resultId) => api.call(`/student/review-details/${resultId}`),
    getLeaderboard: () => api.call('/student/leaderboard'),

    // --- Admin Endpoints ---
    getAdminDashboard: () => api.call('/admin/dashboard-data'),
    getParticipants: () => api.call('/admin/participants'),
    addParticipant: (data) => api.call('/admin/participants', 'POST', data),
    updateParticipant: (id, data) => api.call(`/admin/participants/${id}`, 'PUT', data),
    deleteParticipant: (id) => api.call(`/admin/participants/${id}`, 'DELETE'),
    
    getBadges: () => api.call('/admin/badges'),
    addBadge: (data) => api.call('/admin/badges', 'POST', data),

    getSettings: () => api.call('/admin/settings'),
    updateSettings: (data) => api.call('/admin/settings', 'POST', data),
    // ... Other admin endpoints will be added here following the same pattern
};
