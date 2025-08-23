// static/js/ui.js
// =================================================================
// Handles all UI rendering and DOM manipulation.
// Creates HTML components from data.
// =================================================================

const ui = {
    // --- Element Selectors ---
    elements: {
        loader: document.getElementById('loader'),
        // Views
        studentLoginView: document.getElementById('studentLoginView'),
        studentDashboardView: document.getElementById('studentDashboardView'),
        quizView: document.getElementById('quizView'),
        resultView: document.getElementById('resultView'),
        adminDashboardView: document.getElementById('adminDashboardView'),
        // Containers
        studentDashboardContent: document.getElementById('studentDashboardContent'),
        modalsContainer: document.getElementById('modals-container'),
        // Header
        userGreeting: document.getElementById('userGreeting'),
        logoutButton: document.getElementById('logoutButton'),
        adminLoginButton: document.getElementById('adminLoginButton'),
    },

    // --- View Management ---
    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
        if (this.elements[viewId]) {
            this.elements[viewId].style.display = 'block';
        }
    },

    // --- Loader ---
    showLoader() { this.elements.loader.style.display = 'flex'; },
    hideLoader() { this.elements.loader.style.display = 'none'; },

    // --- Header UI ---
    updateHeader(user) {
        if (user) {
            let greeting = `স্বাগতম, ${user.name}`;
            if (user.type === 'admin') {
                greeting += ` (${user.role})`;
            }
            this.elements.userGreeting.textContent = greeting;
            this.elements.userGreeting.style.display = 'inline-block';
            this.elements.logoutButton.style.display = 'inline-block';
            this.elements.adminLoginButton.style.display = 'none';
        } else {
            this.elements.userGreeting.style.display = 'none';
            this.elements.logoutButton.style.display = 'none';
            this.elements.adminLoginButton.style.display = 'inline-block';
        }
    },
    
    // --- Student Login View ---
    renderStudentLogin() {
        this.elements.studentLoginView.innerHTML = `
            <div class="card login-card">
                <h2 class="text-3xl font-bold mb-2 title-font text-center">কুইজে অংশগ্রহণ করুন</h2>
                <p id="loginPageMessage" class="text-center text-[var(--text-secondary)] mb-6">আপনার আইডি এবং পিন ব্যবহার করে লগইন করুন।</p>
                <form id="studentLoginForm">
                    <select id="studentClass" class="input-field" required><option value="">আপনার শ্রেণী নির্বাচন করুন</option></select>
                    <input type="number" id="studentRoll" class="input-field" placeholder="অংশগ্রহণকারী আইডি (রোল)" required>
                    <input type="password" id="studentPin" class="input-field" placeholder="প্রবেশ কোড (পিন)" required>
                    <button type="submit" class="action-button mt-2">কুইজ শুরু করুন</button>
                    <p id="loginError" class="text-red-500 mt-4 hidden text-center font-bold"></p>
                </form>
            </div>`;
    },

    // --- Student Dashboard ---
    renderStudentDashboard({ activeQuizzes, history, badges }) {
        // Render Active Quizzes
        const activeQuizzesContent = document.getElementById('activeQuizzesContent');
        if (activeQuizzes.length > 0) {
            activeQuizzesContent.innerHTML = `
                <h2 class="text-4xl title-font text-center mb-2">সক্রিয় কুইজসমূহ</h2>
                <p class="text-center text-[var(--text-secondary)] mb-8">নিচের তালিকা থেকে আপনার পছন্দের কুইজটি শুরু করুন।</p>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${activeQuizzes.map(quiz => this.createQuizCard(quiz)).join('')}
                </div>`;
        } else {
            activeQuizzesContent.innerHTML = '<p class="text-center text-[var(--text-secondary)] col-span-full">এই মুহূর্তে আপনার ক্লাসের জন্য কোনো সক্রিয় কুইজ নেই।</p>';
        }

        // Render History
        const myResultsContent = document.getElementById('myResultsContent');
        myResultsContent.innerHTML = this.createHistoryTable(history);
        
        // Render Badges
        const myBadgesContent = document.getElementById('myBadgesContent');
        myBadgesContent.innerHTML = this.createBadgesGrid(badges);

        // Leaderboard will be rendered on tab click
    },

    createQuizCard(quiz) {
        return `
            <div class="card !p-0 overflow-hidden">
                <img src="${quiz.clublogourl || 'https://placehold.co/600x400/3b82f6/ffffff?text=' + encodeURIComponent(quiz.clubname)}" class="w-full h-40 object-cover">
                <div class="p-4">
                    <h3 class="text-2xl title-font">${quiz.quiztitle}</h3>
                    <p class="font-bold text-[var(--accent)]">${quiz.clubname}</p>
                    <p class="text-sm text-[var(--text-secondary)]">প্রশ্ন: ${quiz.totalquestions} | সময়: ${quiz.timelimitminutes} মিনিট</p>
                    <button class="start-quiz-btn action-button mt-4" data-quiz-id="${quiz.quizid}" ${quiz.isCompleted ? 'disabled' : ''}>
                        ${quiz.isCompleted ? 'সম্পন্ন' : 'কুইজ শুরু করুন'}
                    </button>
                </div>
            </div>`;
    },

    createHistoryTable(history) {
        if (history.length === 0) {
            return `<div class="card text-center"><p>আপনি এখনও কোনো কুইজে অংশগ্রহণ করেননি।</p></div>`;
        }
        return `
            <div class="table-wrapper">
                <table class="table-auto">
                    <thead><tr><th>কুইজের নাম</th><th>স্কোর</th><th>তারিখ</th><th>কার্যক্রম</th></tr></thead>
                    <tbody>
                        ${history.map(res => `
                            <tr>
                                <td>${res.quizTitle}</td>
                                <td><span class="font-bold">${res.score} / ${res.totalQuestions}</span></td>
                                <td>${new Date(res.timestamp).toLocaleString()}</td>
                                <td><button class="student-review-btn action-button !w-auto !text-xs !py-1 !px-2" data-result-id="${res.resultId}">পর্যালোচনা</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    },
    
    createBadgesGrid(badges) {
        if (badges.length === 0) {
            return `<div class="card text-center"><p>আপনি এখনও কোনো ব্যাজ অর্জন করেননি।</p></div>`;
        }
        return `
            <h2 class="text-4xl title-font text-center mb-8">অর্জিত ব্যাজসমূহ</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center">
                ${badges.map(badge => `
                    <div class="flex flex-col items-center">
                        <img src="${badge.icon_url}" alt="${badge.name}" class="w-24 h-24 rounded-full border-4 border-[var(--accent)] mb-2">
                        <h3 class="font-bold">${badge.name}</h3>
                        <p class="text-xs text-slate-500">${badge.description}</p>
                        <p class="text-xs mt-1">অর্জিত: ${badge.awarded_on}</p>
                    </div>
                `).join('')}
            </div>`;
    },

    renderLeaderboard(leaderboardData) {
        const leaderboardContent = document.getElementById('leaderboardContent');
        leaderboardContent.innerHTML = `
            <h2 class="text-4xl title-font text-center mb-8">লিডারবোর্ড</h2>
            <div class="table-wrapper max-w-2xl mx-auto">
                <table class="table-auto">
                    <thead><tr><th>র‍্যাঙ্ক</th><th>নাম</th><th>শ্রেণী</th><th>পয়েন্ট</th></tr></thead>
                    <tbody>
                        ${leaderboardData.map(p => `
                            <tr>
                                <td class="text-center font-bold text-lg">${p.rank}</td>
                                <td>${p.name}</td>
                                <td class="text-center">${p.class}</td>
                                <td class="text-center font-bold text-lg">${p.points}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    // --- Quiz View ---
    renderQuizView(quizData, question, index) {
        // This function will render the quiz interface
        // For brevity, the full implementation will be in main.js logic
    },
    
    // --- Admin Dashboard ---
    renderAdminDashboard() {
        // This will render the main layout for the admin panel
        // Specific tabs will be rendered on click
    },

    // --- Modals ---
    showModal(title, content, onConfirm = null, confirmText = 'Confirm') {
        const modalId = `modal-${Date.now()}`;
        const modalHTML = `
            <div id="${modalId}" class="modal-backdrop">
                <div class="modal-content w-11/12 max-w-md relative">
                    <h2 class="text-2xl font-bold mb-4 title-font">${title}</h2>
                    <div>${content}</div>
                    <div class="mt-6 flex justify-end gap-4">
                        <button class="modal-cancel-btn action-button !bg-slate-500">Cancel</button>
                        ${onConfirm ? `<button class="modal-confirm-btn action-button">${confirmText}</button>` : ''}
                    </div>
                </div>
            </div>`;
        this.elements.modalsContainer.insertAdjacentHTML('beforeend', modalHTML);

        const modalElement = document.getElementById(modalId);
        modalElement.querySelector('.modal-cancel-btn').addEventListener('click', () => modalElement.remove());
        if (onConfirm) {
            modalElement.querySelector('.modal-confirm-btn').addEventListener('click', () => {
                onConfirm();
                modalElement.remove();
            });
        }
    },
};
