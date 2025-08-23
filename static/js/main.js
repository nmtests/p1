// static/js/main.js
// =================================================================
// Main application controller.
// Initializes the app, handles events, and manages state.
// =================================================================

// --- Application State ---
let state = {
    currentUser: null,
    currentView: 'studentLoginView',
    // Quiz state
    currentQuizData: {},
    currentQuestionIndex: 0,
    userAnswers: {},
    quizTimerInterval: null,
};

// --- App Initialization ---
async function initialize() {
    ui.showLoader();
    state.currentUser = api.getUserFromToken();
    ui.updateHeader(state.currentUser);

    if (state.currentUser) {
        if (state.currentUser.type === 'student') {
            await showStudentDashboard();
        } else if (state.currentUser.type === 'admin') {
            // showAdminDashboard(); // We will implement this later
            ui.showView('adminDashboardView'); // Placeholder
        }
    } else {
        ui.renderStudentLogin();
        ui.showView('studentLoginView');
    }
    ui.hideLoader();
}

// --- Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    initialize();
    addEventListeners();
});

// --- Event Handlers ---
function addEventListeners() {
    const body = document.body;

    // Student Login
    body.addEventListener('submit', handleStudentLogin);
    
    // Logout
    ui.elements.logoutButton.addEventListener('click', handleLogout);

    // Student Dashboard Tabs
    body.addEventListener('click', handleStudentTabClick);
    
    // Start Quiz
    body.addEventListener('click', handleStartQuiz);
}

async function handleStudentLogin(e) {
    if (e.target.id !== 'studentLoginForm') return;
    e.preventDefault();
    const form = e.target;
    const errorEl = form.querySelector('#loginError');
    errorEl.classList.add('hidden');
    ui.showLoader();

    try {
        const data = await api.studentLogin(
            form.querySelector('#studentClass').value,
            form.querySelector('#studentRoll').value,
            form.querySelector('#studentPin').value
        );
        api.setToken(data.access_token);
        await initialize(); // Re-initialize the app state
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        ui.hideLoader();
    }
}

function handleLogout() {
    api.removeToken();
    state.currentUser = null;
    window.location.reload();
}

async function handleStudentTabClick(e) {
    if (!e.target.matches('.student-tab-button')) return;
    
    const tab = e.target.dataset.tab;

    // Toggle active class for tabs
    document.querySelectorAll('.student-tab-button').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    // Show the correct content
    document.querySelectorAll('.student-tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`${tab}Content`).classList.remove('hidden');

    // Fetch data if needed
    if (tab === 'leaderboard') {
        ui.showLoader();
        const leaderboardData = await api.getLeaderboard();
        ui.renderLeaderboard(leaderboardData);
        ui.hideLoader();
    }
}

async function handleStartQuiz(e) {
    if (!e.target.matches('.start-quiz-btn')) return;
    
    const quizId = e.target.dataset.quizId;
    ui.showLoader();
    try {
        const questions = await api.getQuizDetails(quizId);
        // Quiz starting logic will go here
        console.log("Starting quiz with questions:", questions);
        ui.showView('quizView');
        // We will build the full quiz logic in the next step
    } catch (error) {
        ui.showModal('Error', `Could not start the quiz: ${error.message}`);
    } finally {
        ui.hideLoader();
    }
}


// --- Main Functions ---
async function showStudentDashboard() {
    ui.showLoader();
    try {
        const dashboardData = await api.getStudentDashboard();
        ui.renderStudentDashboard(dashboardData);
        ui.showView('studentDashboardView');
    } catch (error) {
        console.error("Failed to load student dashboard:", error);
        // If there's an error (e.g., bad token), log out
        handleLogout();
    } finally {
        ui.hideLoader();
    }
}
