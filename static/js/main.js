// static/js/main.js
// Main application controller.

let state = {
    currentUser: null,
    settings: {},
    adminData: {},
    quizInProgress: false,
    currentQuizData: { info: {}, questions: [] },
    currentQuestionIndex: 0,
    userAnswers: {},
    quizTimerInterval: null,
    resultChart: null,
};

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
    ui.showLoader();
    state.currentUser = api.getUserFromToken();
    ui.updateHeader(state.currentUser);
    
    try {
        state.settings = await api.getSettings();
        ui.applySettings(state.settings);

        if (state.currentUser) {
            if (state.currentUser.type === 'student') await showStudentDashboard();
            else if (state.currentUser.type === 'admin') await showAdminDashboard();
        } else {
            ui.renderStudentLogin(state.settings);
            ui.showView('studentLoginView');
        }
    } catch (error) {
        console.error("Initialization failed:", error);
        ui.showView('studentLoginView'); // Fallback to login
    } finally {
        ui.hideLoader();
    }
    addEventListeners();
}

function addEventListeners() {
    document.body.addEventListener('submit', handleFormSubmits);
    document.body.addEventListener('click', handleClicks);
}

function handleFormSubmits(e) {
    e.preventDefault();
    if (e.target.id === 'studentLoginForm') handleStudentLogin(e.target);
    if (e.target.id === 'adminLoginForm') handleAdminLogin(e.target);
    if (e.target.id === 'participant-form') handleParticipantFormSubmit(e.target);
    if (e.target.id === 'club-form') handleClubFormSubmit(e.target);
    if (e.target.id === 'badge-form') handleBadgeFormSubmit(e.target);
}

function handleClicks(e) {
    const target = e.target;
    if (target.id === 'adminLoginButton') ui.showModal('adminLoginModal', 'অ্যাডমিন লগইন', `<form id="adminLoginForm"><input type="text" id="adminId" class="input-field" placeholder="অ্যাডমিন আইডি" required><input type="password" id="adminPassword" class="input-field" placeholder="পাসওয়ার্ড" required><button type="submit" class="action-button mt-2">লগইন</button><p id="adminLoginError" class="text-red-500 mt-4 hidden"></p></form>`);
    if (target.matches('.modal-close-btn')) ui.closeModal(target.closest('.modal-backdrop').id);
    if (target.id === 'logoutButton') handleLogout();
    if (target.matches('.student-tab-button')) handleStudentTabClick(target);
    if (target.matches('.start-quiz-btn')) handleStartQuiz(target);
    if (target.matches('.option-item')) handleAnswerSelection(target);
    if (target.id === 'nextQuestionBtn' || target.id === 'prevQuestionBtn') handleQuizNav(target.id);
    if (target.id === 'submitQuizBtn') handleSubmitQuiz();
    if (target.id === 'backToDashboardBtn') showStudentDashboard();
    if (target.matches('.student-review-btn')) handleReviewAnswers(target);
    if (target.matches('.admin-sidebar-link')) handleAdminTabClick(target);
    if (target.id === 'add-participant-btn') showParticipantModal();
    if (target.matches('.edit-participant-btn')) showParticipantModal(JSON.parse(target.dataset.participant));
    if (target.matches('.delete-participant-btn')) handleDelete('participant', target.dataset.id, api.deleteParticipant, 'participants');
    if (target.id === 'add-club-btn') showClubModal();
    if (target.matches('.edit-club-btn')) showClubModal(JSON.parse(target.dataset.club));
    if (target.matches('.delete-club-btn')) handleDelete('club', target.dataset.id, api.deleteClub, 'clubs');
    if (target.id === 'add-badge-btn') showBadgeModal();
    if (target.matches('.edit-badge-btn')) showBadgeModal(JSON.parse(target.dataset.badge));
    if (target.matches('.delete-badge-btn')) handleDelete('badge', target.dataset.id, api.deleteBadge, 'badges');
}

// --- Auth ---
async function handleStudentLogin(form) {
    const errorEl = form.querySelector('#loginError');
    errorEl.classList.add('hidden');
    ui.showLoader();
    try {
        const data = await api.studentLogin(form.querySelector('#studentClass').value, form.querySelector('#studentRoll').value, form.querySelector('#studentPin').value);
        api.setToken(data.access_token);
        await initialize();
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        ui.hideLoader();
    }
}

async function handleAdminLogin(form) {
    const errorEl = form.querySelector('#adminLoginError');
    errorEl.classList.add('hidden');
    ui.showLoader();
    try {
        const data = await api.adminLogin(form.querySelector('#adminId').value, form.querySelector('#adminPassword').value);
        api.setToken(data.access_token);
        await initialize();
        ui.closeModal('adminLoginModal');
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
    } finally {
        ui.hideLoader();
    }
}

function handleLogout() {
    api.removeToken();
    window.location.reload();
}

// --- Student Logic ---
async function showStudentDashboard() {
    ui.showLoader();
    try {
        const data = await api.getStudentDashboard();
        ui.renderStudentDashboard(data, state.settings);
        ui.showView('studentDashboardView');
    } catch (error) { handleLogout(); } finally { ui.hideLoader(); }
}

async function handleStudentTabClick(target) {
    const tab = target.dataset.tab;
    document.querySelectorAll('.student-tab-button').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll('.student-tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`${tab}Content`).classList.remove('hidden');
    if (tab === 'leaderboard' && !document.getElementById('leaderboardContent').innerHTML.trim()) {
        ui.showLoader();
        const data = await api.getLeaderboard();
        ui.renderLeaderboard(data);
        ui.hideLoader();
    }
}

async function handleStartQuiz(target) {
    const quizInfo = JSON.parse(target.dataset.quiz);
    ui.showLoader();
    try {
        const questions = await api.getQuizDetails(quizInfo.quizid);
        state.quizInProgress = true;
        state.currentQuizData = { info: quizInfo, questions };
        state.currentQuestionIndex = 0;
        state.userAnswers = {};
        renderCurrentQuestion();
        ui.showView('quizView');
        startTimer(quizInfo.timelimitminutes * 60);
    } catch (error) { ui.showModal('errorModal', 'Error', `<p>${error.message}</p>`); } finally { ui.hideLoader(); }
}

function renderCurrentQuestion() {
    const { info, questions } = state.currentQuizData;
    const question = questions[state.currentQuestionIndex];
    ui.renderQuizInterface(info, question, state.currentQuestionIndex, questions.length);
    const selectedAnswer = state.userAnswers[question.QuestionID];
    if (selectedAnswer) document.querySelector(`.option-item[data-answer="${selectedAnswer}"]`).classList.add('selected-option');
}

function handleAnswerSelection(target) {
    const questionId = state.currentQuizData.questions[state.currentQuestionIndex].QuestionID;
    state.userAnswers[questionId] = target.dataset.answer;
    document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected-option'));
    target.classList.add('selected-option');
}

function handleQuizNav(id) {
    if (id === 'nextQuestionBtn') state.currentQuestionIndex++;
    else if (id === 'prevQuestionBtn') state.currentQuestionIndex--;
    renderCurrentQuestion();
}

function startTimer(duration) {
    clearInterval(state.quizTimerInterval);
    let timer = duration;
    state.quizTimerInterval = setInterval(() => {
        const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
        const seconds = String(timer % 60).padStart(2, '0');
        document.getElementById('quizTimer').textContent = `${minutes}:${seconds}`;
        document.getElementById('progressBar').style.width = `${(timer / duration) * 100}%`;
        if (--timer < 0) {
            clearInterval(state.quizTimerInterval);
            ui.showModal('timerModal', 'Time Up!', '<p>Your time is up. The quiz will be submitted automatically.</p>');
            handleSubmitQuiz();
        }
    }, 1000);
}

function handleSubmitQuiz() {
    const unanswered = state.currentQuizData.questions.length - Object.keys(state.userAnswers).length;
    if (unanswered > 0) {
        ui.showModal('confirmSubmit', 'Unanswered Questions', `<p>You have ${unanswered} unanswered questions. Submit anyway?</p>`);
        document.getElementById('confirmSubmit').querySelector('.modal-content').insertAdjacentHTML('beforeend', `<div class="mt-4 flex justify-end"><button id="confirm-submit-btn" class="action-button">Submit</button></div>`);
        document.getElementById('confirm-submit-btn').onclick = () => { submitAndShowResult(); ui.closeModal('confirmSubmit'); };
    } else {
        submitAndShowResult();
    }
}

async function submitAndShowResult() {
    if (!state.quizInProgress) return;
    state.quizInProgress = false;
    clearInterval(state.quizTimerInterval);
    ui.showLoader();
    try {
        const payload = { quizId: state.currentQuizData.info.quizid, answers: state.userAnswers };
        const result = await api.submitQuiz(payload);
        ui.renderResultView(result.score, result.total, result.resultId, state.settings);
        ui.showView('resultView');
        setTimeout(() => {
            const ctx = document.getElementById('resultChartCanvas').getContext('2d');
            if (state.resultChart) state.resultChart.destroy();
            state.resultChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Correct', 'Incorrect'], datasets: [{ data: [result.score, result.total - result.score], backgroundColor: ['#22c55e', '#ef4444'] }] } });
        }, 100);
    } catch (error) { ui.showModal('errorModal', 'Error', `<p>${error.message}</p>`); } finally { ui.hideLoader(); }
}

async function handleReviewAnswers(target) {
    ui.showLoader();
    const reviewData = await api.getReviewDetails(target.dataset.resultId);
    const content = reviewData.map(q => `<div class="p-4 border-l-4 ${q.iscorrect ? 'border-green-500' : 'border-red-500'} bg-slate-50 rounded"><p class="font-bold">${q.questiontext}</p><p>Your answer: ${q.submittedanswer}</p>${!q.iscorrect ? `<p class="text-green-600">Correct: ${q.correctanswer}</p>` : ''}</div>`).join('');
    ui.showModal('reviewModal', 'Answer Review', content);
    ui.hideLoader();
}

// --- Admin Logic ---
async function showAdminDashboard() {
    ui.showLoader();
    ui.renderAdminLayout(state.currentUser);
    ui.showView('adminDashboardView');
    await loadAdminData();
    ui.renderAdminDashboardTab(state.adminData.stats);
    ui.hideLoader();
}

async function loadAdminData() {
    state.adminData = await api.getAllAdminData();
}

async function handleAdminTabClick(target) {
    const tab = target.dataset.tab;
    document.querySelectorAll('.admin-sidebar-link').forEach(link => link.classList.remove('active'));
    target.classList.add('active');
    document.querySelectorAll('.admin-tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`admin-tab-${tab}`).classList.remove('hidden');
    
    // Render tab content
    if (tab === 'dashboard') ui.renderAdminDashboardTab(state.adminData.stats);
    if (tab === 'participants') ui.renderAdminParticipantsTab(state.adminData.participants);
    if (tab === 'clubs') ui.renderAdminClubsTab(state.adminData.clubs);
    if (tab === 'badges') ui.renderAdminBadgesTab(state.adminData.badges);
}

// Admin Modal Handlers
function showParticipantModal(p = null) {
    const content = `<form id="participant-form" data-id="${p ? p.id : ''}"><input type="text" name="class_name" class="input-field" placeholder="Class" value="${p ? p.class_name : ''}" required><input type="text" name="roll" class="input-field" placeholder="Roll" value="${p ? p.roll : ''}" required><input type="text" name="name" class="input-field" placeholder="Name" value="${p ? p.name : ''}" required><input type="text" name="pin" class="input-field" placeholder="PIN" value="${p ? p.pin : ''}" required><button type="submit" class="action-button mt-4">Save</button></form>`;
    ui.showModal('participantModal', p ? 'Edit Participant' : 'Add Participant', content);
}

async function handleParticipantFormSubmit(form) {
    const id = form.dataset.id;
    const data = Object.fromEntries(new FormData(form));
    ui.showLoader();
    if (id) await api.updateParticipant(id, data);
    else await api.addParticipant(data);
    await loadAdminData();
    ui.renderAdminParticipantsTab(state.adminData.participants);
    ui.closeModal('participantModal');
    ui.hideLoader();
}

function showClubModal(c = null) {
    const content = `<form id="club-form" data-id="${c ? c.id : ''}"><input type="text" name="club_name" class="input-field" placeholder="Club Name" value="${c ? c.club_name : ''}" required><input type="text" name="club_logo_url" class="input-field" placeholder="Logo URL" value="${c ? c.club_logo_url : ''}" required><button type="submit" class="action-button mt-4">Save</button></form>`;
    ui.showModal('clubModal', c ? 'Edit Club' : 'Add Club', content);
}

async function handleClubFormSubmit(form) {
    const id = form.dataset.id;
    const data = Object.fromEntries(new FormData(form));
    ui.showLoader();
    if (id) await api.updateClub(id, data);
    else await api.addClub(data);
    await loadAdminData();
    ui.renderAdminClubsTab(state.adminData.clubs);
    ui.closeModal('clubModal');
    ui.hideLoader();
}

function showBadgeModal(b = null) {
    const content = `<form id="badge-form" data-id="${b ? b.id : ''}"><input type="text" name="name" class="input-field" placeholder="Badge Name" value="${b ? b.name : ''}" required><input type="text" name="description" class="input-field" placeholder="Description" value="${b ? b.description : ''}" required><input type="text" name="icon_url" class="input-field" placeholder="Icon URL" value="${b ? b.icon_url : ''}" required><button type="submit" class="action-button mt-4">Save</button></form>`;
    ui.showModal('badgeModal', b ? 'Edit Badge' : 'Add Badge', content);
}

async function handleBadgeFormSubmit(form) {
    const id = form.dataset.id;
    const data = Object.fromEntries(new FormData(form));
    ui.showLoader();
    if (id) await api.updateBadge(id, data);
    else await api.addBadge(data);
    await loadAdminData();
    ui.renderAdminBadgesTab(state.adminData.badges);
    ui.closeModal('badgeModal');
    ui.hideLoader();
}

async function handleDelete(type, id, apiFunc, tabName) {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
        ui.showLoader();
        await apiFunc(id);
        await loadAdminData();
        if (tabName === 'participants') ui.renderAdminParticipantsTab(state.adminData.participants);
        if (tabName === 'clubs') ui.renderAdminClubsTab(state.adminData.clubs);
        if (tabName === 'badges') ui.renderAdminBadgesTab(state.adminData.badges);
        ui.hideLoader();
    }
}
