// static/js/api.js
// Handles all communication with the backend API.
const API_BASE_URL = "https://okgsquiz.onrender.com//api";

const api = {
    // --- Token Management ---
    setToken(token) { localStorage.setItem('jwt_token', token); },
    getToken() { return localStorage.getItem('jwt_token'); },
    removeToken() { localStorage.removeItem('jwt_token'); },
    getUserFromToken() {
        const token = this.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub;
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
        const config = { method, headers };
        if (body) { config.body = JSON.stringify(body); }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            const data = await response.json();
            if (!response.ok) {
                // IMPORTANT: On auth error, we now throw an error instead of reloading.
                // The main.js file will catch this and call handleLogout().
                if (response.status === 401 || response.status === 422) {
                    throw new Error("Authentication failed. Please log in again.");
                }
                throw new Error(data.message || `Error: ${response.status}`);
            }
            return data;
        } catch (error) {
            console.error(`API call failed: ${method} ${endpoint}`, error);
            throw error;
        }
    },

    // --- Public Endpoint ---
    getSettings: () => api.call('/settings'), // THIS IS THE FIX: Points to the new public endpoint

    // --- Auth Endpoints ---
    studentLogin: (className, roll, pin) => api.call('/auth/student/login', 'POST', { className, roll, pin }),
    adminLogin: (adminId, password) => api.call('/auth/admin/login', 'POST', { adminId, password }),

    // --- Student Endpoints ---
    getStudentDashboard: () => api.call('/student/dashboard-data'),
    getQuizDetails: (quizId) => api.call(`/student/quiz-details/${quizId}`),
    submitQuiz: (payload) => api.call('/student/submit-quiz', 'POST', payload),
    getReviewDetails: (resultId) => api.call(`/student/review-details/${resultId}`),
    getLeaderboard: () => api.call('/student/leaderboard'),

    // --- Admin Endpoints ---
    getAllAdminData: () => api.call('/admin/all-data'),
    // Participants
    addParticipant: (data) => api.call('/admin/participants', 'POST', data),
    updateParticipant: (id, data) => api.call(`/admin/participants/${id}`, 'PUT', data),
    deleteParticipant: (id) => api.call(`/admin/participants/${id}`, 'DELETE'),
    // Clubs
    addClub: (data) => api.call('/admin/clubs', 'POST', data),
    updateClub: (id, data) => api.call(`/admin/clubs/${id}`, 'PUT', data),
    deleteClub: (id) => api.call(`/admin/clubs/${id}`, 'DELETE'),
    // Badges
    addBadge: (data) => api.call('/admin/badges', 'POST', data),
    updateBadge: (id, data) => api.call(`/admin/badges/${id}`, 'PUT', data),
    deleteBadge: (id) => api.call(`/admin/badges/${id}`, 'DELETE'),
    // Settings (Update only)
    updateSettings: (data) => api.call('/admin/settings', 'POST', data),
};
