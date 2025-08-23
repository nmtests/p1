// static/js/ui.js
// Handles all UI rendering and DOM manipulation.

const ui = {
    elements: {
        loader: document.getElementById('loader'),
        studentLoginView: document.getElementById('studentLoginView'),
        studentDashboardView: document.getElementById('studentDashboardView'),
        quizView: document.getElementById('quizView'),
        resultView: document.getElementById('resultView'),
        adminDashboardView: document.getElementById('adminDashboardView'),
        modalsContainer: document.getElementById('modals-container'),
        userGreeting: document.getElementById('userGreeting'),
        logoutButton: document.getElementById('logoutButton'),
        adminLoginButton: document.getElementById('adminLoginButton'),
        portalTitleNav: document.getElementById('portalTitleNav'),
        portalAnnouncement: document.getElementById('portalAnnouncement'),
        schoolLogo: document.getElementById('schoolLogo'),
        footer: document.querySelector('.footer'),
    },

    showView(viewId) {
        document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
        if (this.elements[viewId]) this.elements[viewId].style.display = 'block';
    },

    showLoader() { this.elements.loader.style.display = 'flex'; },
    hideLoader() { this.elements.loader.style.display = 'none'; },

    updateHeader(user) {
        if (user) {
            let greeting = `স্বাগতম, ${user.name}`;
            if (user.type === 'admin') greeting += ` (${user.role})`;
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

    applySettings(settings) {
        this.elements.portalTitleNav.textContent = settings.portaltitle || 'Quiz Portal';
        this.elements.portalAnnouncement.textContent = settings.portalannouncement || '';
        this.elements.schoolLogo.src = settings.schoollogourl || '';
        document.documentElement.style.setProperty('--accent', settings.themecolorprimary || '#3b82f6');
        this.elements.footer.innerHTML = `<div class="footer-content"><p>&copy; ${new Date().getFullYear()} ${settings.portaltitle || 'Quiz Portal'}. All Rights Reserved.</p></div>`;
    },

    renderStudentLogin(settings) {
        this.elements.studentLoginView.innerHTML = `<div class="card login-card"><h2 class="text-3xl font-bold mb-2 title-font text-center">কুইজে অংশগ্রহণ করুন</h2><p class="text-center text-[var(--text-secondary)] mb-6">${settings.loginpagemessage || ''}</p><form id="studentLoginForm"><input type="text" id="studentClass" class="input-field" placeholder="আপনার শ্রেণী" required><input type="number" id="studentRoll" class="input-field" placeholder="অংশগ্রহণকারী আইডি (রোল)" required><input type="password" id="studentPin" class="input-field" placeholder="প্রবেশ কোড (পিন)" required><button type="submit" class="action-button mt-2">লগইন করুন</button><p id="loginError" class="text-red-500 mt-4 hidden text-center font-bold"></p></form></div>`;
    },

    renderStudentDashboard(data, settings) {
        this.elements.studentDashboardView.innerHTML = `<div class="flex border-b border-[var(--border)] mb-6"><button data-tab="activeQuizzes" class="student-tab-button tab-button active">সক্রিয় কুইজ</button><button data-tab="myResults" class="student-tab-button tab-button">আমার ফলাফল</button><button data-tab="myBadges" class="student-tab-button tab-button">আমার ব্যাজ</button><button data-tab="leaderboard" class="student-tab-button tab-button">লিডারবোর্ড</button></div><div id="studentDashboardContent"><div id="activeQuizzesContent" class="student-tab-content"></div><div id="myResultsContent" class="student-tab-content hidden"></div><div id="myBadgesContent" class="student-tab-content hidden"></div><div id="leaderboardContent" class="student-tab-content hidden"></div></div>`;
        document.getElementById('activeQuizzesContent').innerHTML = this.createActiveQuizzesSection(data.activeQuizzes, settings);
        document.getElementById('myResultsContent').innerHTML = this.createHistoryTable(data.history);
        document.getElementById('myBadgesContent').innerHTML = this.createBadgesGrid(data.badges);
    },

    createActiveQuizzesSection(quizzes, settings) {
        if (quizzes.length === 0) return `<p class="text-center text-[var(--text-secondary)] col-span-full">এই মুহূর্তে আপনার ক্লাসের জন্য কোনো সক্রিয় কুইজ নেই।</p>`;
        return `<h2 class="text-4xl title-font text-center mb-2">সক্রিয় কুইজসমূহ</h2><p class="text-center text-[var(--text-secondary)] mb-8">${settings.dashboardwelcomemessage || ''}</p><div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">${quizzes.map(q => this.createQuizCard(q)).join('')}</div>`;
    },

    createQuizCard(quiz) {
        return `<div class="card !p-0 overflow-hidden"><img src="${quiz.clublogourl || ''}" class="w-full h-40 object-cover"><div class="p-4"><h3 class="text-2xl title-font">${quiz.quiztitle}</h3><p class="font-bold text-[var(--accent)]">${quiz.clubname}</p><p class="text-sm text-[var(--text-secondary)]">প্রশ্ন: ${quiz.totalquestions} | সময়: ${quiz.timelimitminutes} মিনিট</p><button class="start-quiz-btn action-button mt-4" data-quiz='${JSON.stringify(quiz)}' ${quiz.isCompleted ? 'disabled' : ''}>${quiz.isCompleted ? 'সম্পন্ন' : 'কুইজ শুরু করুন'}</button></div></div>`;
    },

    createHistoryTable(history) {
        if (history.length === 0) return `<div class="card text-center"><p>আপনি এখনও কোনো কুইজে অংশগ্রহণ করেননি।</p></div>`;
        return `<div class="table-wrapper"><table class="table-auto"><thead><tr><th>কুইজের নাম</th><th>স্কোর</th><th>তারিখ</th><th>কার্যক্রম</th></tr></thead><tbody>${history.map(res => `<tr><td>${res.quizTitle}</td><td><span class="font-bold">${res.score}/${res.totalQuestions}</span></td><td>${new Date(res.timestamp).toLocaleString()}</td><td><button class="student-review-btn action-button !w-auto !text-xs !py-1 !px-2" data-result-id="${res.resultId}">পর্যালোচনা</button></td></tr>`).join('')}</tbody></table></div>`;
    },

    createBadgesGrid(badges) {
        if (badges.length === 0) return `<div class="card text-center"><p>আপনি এখনও কোনো ব্যাজ অর্জন করেননি।</p></div>`;
        return `<h2 class="text-4xl title-font text-center mb-8">অর্জিত ব্যাজসমূহ</h2><div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center">${badges.map(b => `<div class="flex flex-col items-center"><img src="${b.icon_url}" alt="${b.name}" class="w-24 h-24 rounded-full border-4 border-[var(--accent)] mb-2"><h3 class="font-bold">${b.name}</h3><p class="text-xs text-slate-500">${b.description}</p><p class="text-xs mt-1">অর্জিত: ${b.awarded_on}</p></div>`).join('')}</div>`;
    },

    renderLeaderboard(leaderboard) {
        document.getElementById('leaderboardContent').innerHTML = `<h2 class="text-4xl title-font text-center mb-8">লিডারবোর্ড</h2><div class="table-wrapper max-w-2xl mx-auto"><table class="table-auto"><thead><tr><th>র‍্যাঙ্ক</th><th>নাম</th><th>শ্রেণী</th><th>পয়েন্ট</th></tr></thead><tbody>${leaderboard.map(p => `<tr><td class="text-center font-bold text-lg">${p.rank}</td><td>${p.name}</td><td class="text-center">${p.class}</td><td class="text-center font-bold text-lg">${p.points}</td></tr>`).join('')}</tbody></table></div>`;
    },

    renderQuizInterface(quiz, question, index, total) {
        const options = [question.OptionA, question.OptionB, question.OptionC, question.OptionD].filter(o => o).sort(() => Math.random() - 0.5);
        this.elements.quizView.innerHTML = `<div class="card"><div class="flex justify-between items-center mb-4 font-bold"><p>প্রশ্ন <span id="questionNumber">${index + 1}</span>/${total}</p><span id="quizTimer" class="title-font text-2xl text-[var(--accent)]">00:00</span></div><div class="h-2.5 w-full rounded-full bg-gray-200 mb-6"><div id="progressBar" class="bg-[var(--accent)] h-2.5 rounded-full" style="width: 100%;"></div></div><h2 class="text-2xl font-bold mb-6">${question.QuestionText}</h2><div id="optionsContainer" class="space-y-3">${options.map(opt => `<div class="option-item p-4 border rounded-lg cursor-pointer" data-answer="${opt}">${opt}</div>`).join('')}</div><div class="mt-8 flex justify-between"><button id="prevQuestionBtn" class="action-button !w-auto !bg-slate-500" ${index === 0 ? 'disabled' : ''}>পূর্ববর্তী</button>${index === total - 1 ? `<button id="submitQuizBtn" class="action-button !w-auto !bg-green-500">জমা দিন</button>` : `<button id="nextQuestionBtn" class="action-button !w-auto">পরবর্তী</button>`}</div></div>`;
    },

    renderResultView(score, total, resultId, settings) {
        this.elements.resultView.innerHTML = `<div class="card text-center"><h2 class="text-5xl title-font mb-4 text-[var(--accent)]">কুইজ সম্পন্ন!</h2><p class="text-3xl font-bold my-4">আপনার স্কোর: ${score}/${total}</p><div class="max-w-md mx-auto my-6"><canvas id="resultChartCanvas"></canvas></div><div class="flex gap-4 mt-6">${settings.allowanswerreview === 'True' ? `<button id="reviewAnswersBtn" data-result-id="${resultId}" class="action-button !bg-indigo-500">উত্তর পর্যালোচনা</button>` : ''}<button id="backToDashboardBtn" class="action-button">ড্যাশবোর্ডে ফিরে যান</button></div></div>`;
    },

    renderAdminLayout(user) {
        this.elements.adminDashboardView.innerHTML = `<div class="admin-layout"><aside id="adminSidebar" class="admin-sidebar"></aside><div id="adminMainContent" class="admin-main-content"></div></div>`;
        document.getElementById('adminSidebar').innerHTML = `<h2 class="text-2xl font-bold title-font mb-8">অ্যাডমিন প্যানেল</h2><nav class="flex flex-col gap-2"><a href="#" data-tab="dashboard" class="admin-sidebar-link sidebar-link active">ড্যাশবোর্ড</a><a href="#" data-tab="participants" class="admin-sidebar-link sidebar-link">অংশগ্রহণকারী</a><a href="#" data-tab="quizzes" class="admin-sidebar-link sidebar-link">কুইজসমূহ</a><a href="#" data-tab="clubs" class="admin-sidebar-link sidebar-link">ক্লাবসমূহ</a>${user.role === 'SuperAdmin' ? `<a href="#" data-tab="badges" class="admin-sidebar-link sidebar-link">ব্যাজ</a><a href="#" data-tab="settings" class="admin-sidebar-link sidebar-link">সেটিংস</a>` : ''}</nav>`;
        document.getElementById('adminMainContent').innerHTML = `<div id="admin-tab-dashboard" class="admin-tab-content"></div><div id="admin-tab-participants" class="admin-tab-content hidden"></div><div id="admin-tab-quizzes" class="admin-tab-content hidden"></div><div id="admin-tab-clubs" class="admin-tab-content hidden"></div>${user.role === 'SuperAdmin' ? `<div id="admin-tab-badges" class="admin-tab-content hidden"></div><div id="admin-tab-settings" class="admin-tab-content hidden"></div>` : ''}`;
    },

    renderAdminDashboardTab(stats) {
        document.getElementById('admin-tab-dashboard').innerHTML = `<h1 class="text-3xl font-bold title-font mb-6">ড্যাশবোর্ড ওভারভিউ</h1><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><div class="card !p-6 text-center"><p class="text-slate-500">মোট শিক্ষার্থী</p><p class="text-3xl font-bold">${stats.students}</p></div><div class="card !p-6 text-center"><p class="text-slate-500">মোট কুইজ</p><p class="text-3xl font-bold">${stats.quizzes}</p></div><div class="card !p-6 text-center"><p class="text-slate-500">মোট অংশগ্রহণ</p><p class="text-3xl font-bold">${stats.results}</p></div><div class="card !p-6 text-center"><p class="text-slate-500">মোট ক্লাব</p><p class="text-3xl font-bold">${stats.clubs}</p></div></div>`;
    },

    renderAdminParticipantsTab(participants) {
        document.getElementById('admin-tab-participants').innerHTML = `<h1 class="text-3xl font-bold title-font mb-6">অংশগ্রহণকারী ম্যানেজমেন্ট</h1><button id="add-participant-btn" class="action-button !w-auto mb-6">নতুন অংশগ্রহণকারী</button><div class="table-wrapper"><table class="table-auto"><thead><tr><th>শ্রেণী</th><th>রোল</th><th>নাম</th><th>কার্যক্রম</th></tr></thead><tbody>${participants.map(p => `<tr><td>${p.class_name}</td><td>${p.roll}</td><td>${p.name}</td><td class="flex gap-2"><button class="edit-participant-btn action-button !text-xs !py-1 !px-2" data-participant='${JSON.stringify(p)}'>এডিট</button><button class="delete-participant-btn action-button !text-xs !py-1 !px-2 !bg-red-500" data-id="${p.id}">ডিলিট</button></td></tr>`).join('')}</tbody></table></div>`;
    },
    
    renderAdminClubsTab(clubs) {
        document.getElementById('admin-tab-clubs').innerHTML = `<h1 class="text-3xl font-bold title-font mb-6">ক্লাব ম্যানেজমেন্ট</h1><button id="add-club-btn" class="action-button !w-auto mb-6">নতুন ক্লাব</button><div class="table-wrapper"><table class="table-auto"><thead><tr><th>লোগো</th><th>নাম</th><th>কার্যক্রম</th></tr></thead><tbody>${clubs.map(c => `<tr><td><img src="${c.club_logo_url}" class="w-10 h-10 rounded-full object-cover"></td><td>${c.club_name}</td><td class="flex gap-2"><button class="edit-club-btn action-button !text-xs !py-1 !px-2" data-club='${JSON.stringify(c)}'>এডিট</button><button class="delete-club-btn action-button !text-xs !py-1 !px-2 !bg-red-500" data-id="${c.id}">ডিলিট</button></td></tr>`).join('')}</tbody></table></div>`;
    },
    
    renderAdminBadgesTab(badges) {
        document.getElementById('admin-tab-badges').innerHTML = `<h1 class="text-3xl font-bold title-font mb-6">ব্যাজ ম্যানেজমেন্ট</h1><button id="add-badge-btn" class="action-button !w-auto mb-6">নতুন ব্যাজ</button><div class="table-wrapper"><table class="table-auto"><thead><tr><th>আইকন</th><th>নাম</th><th>বিবরণ</th><th>কার্যক্রম</th></tr></thead><tbody>${badges.map(b => `<tr><td><img src="${b.icon_url}" class="w-10 h-10 rounded-full object-cover"></td><td>${b.name}</td><td>${b.description}</td><td class="flex gap-2"><button class="edit-badge-btn action-button !text-xs !py-1 !px-2" data-badge='${JSON.stringify(b)}'>এডিট</button><button class="delete-badge-btn action-button !text-xs !py-1 !px-2 !bg-red-500" data-id="${b.id}">ডিলিট</button></td></tr>`).join('')}</tbody></table></div>`;
    },

    showModal(id, title, content) {
        this.elements.modalsContainer.innerHTML = `<div id="${id}" class="modal-backdrop"><div class="modal-content w-11/12 max-w-lg relative"><button class="modal-close-btn absolute top-4 right-4 text-2xl font-bold text-slate-500 hover:text-red-500">&times;</button><h2 class="text-3xl font-bold mb-4 title-font">${title}</h2><div>${content}</div></div></div>`;
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.remove();
    },
};
