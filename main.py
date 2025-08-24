# main.py
# =================================================================
# Quiz Portal Backend using Python (Flask & SQLAlchemy for Supabase)
# This version includes the complete and fully functional Admin Panel.
# Author: Gemini
# Version: 4.0.1 (Hotfix for settings API route)
# =================================================================

import os
import json
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import random

# --- App Initialization ---
app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')
CORS(app)

# --- Database Configuration ---
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://user:password@host:port/dbname')
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# --- Database Models ---
class Setting(db.Model):
    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.String(500))

class Participant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(50), nullable=False)
    roll = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    pin = db.Column(db.String(50), nullable=False)
    __table_args__ = (db.UniqueConstraint('class_name', 'roll', name='_class_roll_uc'),)

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.String(80), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='Teacher')
    assigned_classes = db.Column(db.String(200), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Club(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    club_id = db.Column(db.String(50), unique=True, nullable=False)
    club_name = db.Column(db.String(150), nullable=False)
    club_logo_url = db.Column(db.String(300))

class Quiz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.String(50), unique=True, nullable=False)
    quiz_title = db.Column(db.String(200), nullable=False)
    club_id = db.Column(db.String(50), db.ForeignKey('club.club_id'), nullable=False)
    status = db.Column(db.String(50), default='Pending')
    assigned_classes = db.Column(db.String(200), default='All')
    time_limit_minutes = db.Column(db.Integer, default=10)
    questions = db.relationship('Question', backref='quiz', lazy=True, cascade="all, delete-orphan")
    club = db.relationship('Club', backref='quizzes', lazy=True)

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.String(50), unique=True, nullable=False)
    quiz_id = db.Column(db.String(50), db.ForeignKey('quiz.quiz_id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(200), nullable=False)
    option_b = db.Column(db.String(200), nullable=False)
    option_c = db.Column(db.String(200), nullable=False)
    option_d = db.Column(db.String(200), nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)
    explanation = db.Column(db.Text, nullable=True)

class Result(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.String(50), unique=True, nullable=False)
    quiz_id = db.Column(db.String(50), db.ForeignKey('quiz.quiz_id'), nullable=False)
    student_roll = db.Column(db.String(50), nullable=False)
    student_class = db.Column(db.String(50), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    submitted_answers = db.Column(db.Text)

# --- API Endpoints ---
@app.route('/')
def home():
    return render_template('index.html')

# FIXED: Added a dedicated GET route for settings to resolve the frontend error.
@app.route('/api/settings', methods=['GET'])
def get_settings_handler():
    try:
        settings_db = Setting.query.all()
        settings = {s.key: s.value for s in settings_db}
        for key in ['allowanswerreview', 'allowmultipleattempts']:
            if key in settings:
                settings[key] = str(settings[key]).lower() == 'true'
        return jsonify({"result": "success", "data": settings})
    except Exception as e:
        print(f"Error fetching settings: {e}")
        return jsonify({"result": "error", "message": "Could not fetch settings"}), 500

@app.route('/api', methods=['POST'])
def api_handler():
    data = request.get_json()
    action = data.get('action')
    payload = data.get('payload', {})
    
    action_functions = {
        # Student Actions
        'studentLogin': student_login,
        'getActiveQuizzes': get_active_quizzes,
        'getQuizDetails': get_quiz_details,
        'submitQuiz': submit_quiz,
        'getStudentHistory': get_student_history,
        'getAnswerReviewDetails': get_answer_review_details,
        
        # Admin Actions
        'adminLogin': admin_login,
        'getAdminDashboardData': get_admin_dashboard_data,
        'getWebsiteContent': get_website_content,
        'updateWebsiteSettings': update_website_settings,
        'addParticipant': add_participant,
        'updateParticipant': update_participant,
        'deleteParticipant': delete_participant,
        'addClub': add_club,
        'updateClub': update_club,
        'deleteClub': delete_club,
        'createNewQuiz': create_new_quiz,
        'getQuizForEdit': get_quiz_for_edit,
        'updateQuiz': update_quiz,
        'updateQuizStatus': update_quiz_status,
        'deleteQuiz': delete_quiz,
        'addAdmin': add_admin,
        'updateAdmin': update_admin,
        'deleteAdmin': delete_admin,
        'getQuizResultAnalysis': get_quiz_result_analysis,
        'getClassList': get_class_list,
    }
    handler = action_functions.get(action)
    if handler:
        try:
            return handler(payload)
        except Exception as e:
            print(f"Error handling action '{action}': {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"result": "error", "message": str(e)}), 500
    return jsonify({"result": "error", "message": f"Action '{action}' not found."}), 404

# --- Helper Functions ---
def object_as_dict(obj):
    return {c.key: getattr(obj, c.key) for c in db.inspect(obj).mapper.column_attrs}

# --- Student Functions ---
def student_login(payload):
    p = Participant.query.filter_by(class_name=payload.get('className'), roll=payload.get('roll'), pin=payload.get('pin')).first()
    if p: return jsonify({"result": "success", "data": {"name": p.name, "roll": p.roll, "className": p.class_name}})
    return jsonify({"result": "error", "message": "Invalid credentials"}), 401

def get_active_quizzes(payload):
    student_class = payload.get('className')
    student_roll = payload.get('studentRoll')
    active_quizzes = Quiz.query.filter(Quiz.status == 'Active', (Quiz.assigned_classes == 'All') | (Quiz.assigned_classes.contains(student_class))).all()
    student_results = Result.query.filter_by(student_roll=student_roll, student_class=student_class).all()
    completed_quiz_ids = {res.quiz_id for res in student_results}
    quizzes_list = [{
        "quizid": q.quiz_id, "quiztitle": q.quiz_title, "clubname": q.club.club_name,
        "clublogourl": q.club.club_logo_url, "totalquestions": len(q.questions),
        "timelimitminutes": q.time_limit_minutes, "isCompleted": q.quiz_id in completed_quiz_ids
    } for q in active_quizzes]
    return jsonify({"result": "success", "data": quizzes_list})

def get_quiz_details(payload):
    quiz = Quiz.query.filter_by(quiz_id=payload.get('quizId')).first_or_404()
    questions_list = [{"QuestionID": q.question_id, "QuestionText": q.question_text, "OptionA": q.option_a, "OptionB": q.option_b, "OptionC": q.option_c, "OptionD": q.option_d} for q in quiz.questions]
    return jsonify({"result": "success", "data": questions_list})

def submit_quiz(payload):
    quiz_id = payload.get('quizId')
    answers = payload.get('answers', {})
    quiz_questions = Question.query.filter_by(quiz_id=quiz_id).all()
    score = 0
    for q in quiz_questions:
        correct_option_text = getattr(q, f"option_{q.correct_answer.lower()}")
        if answers.get(q.question_id) == correct_option_text: score += 1
    new_result = Result(
        result_id=f"RES{int(datetime.datetime.utcnow().timestamp() * 1000)}", quiz_id=quiz_id,
        student_roll=payload.get('studentRoll'), student_class=payload.get('studentClass'),
        score=score, total_questions=len(quiz_questions), submitted_answers=json.dumps(answers)
    )
    db.session.add(new_result)
    db.session.commit()
    return jsonify({"result": "success", "data": {"resultId": new_result.result_id, "score": score, "total": len(quiz_questions)}})

def get_student_history(payload):
    results = Result.query.filter_by(student_roll=payload.get('studentRoll'), student_class=payload.get('studentClass')).order_by(Result.timestamp.desc()).all()
    history_list = []
    for res in results:
        quiz = Quiz.query.filter_by(quiz_id=res.quiz_id).first()
        history_list.append({
            "resultId": res.result_id, "quizTitle": quiz.quiz_title if quiz else "N/A",
            "score": res.score, "totalQuestions": res.total_questions, "timestamp": res.timestamp.isoformat()
        })
    return jsonify({"result": "success", "data": history_list})

def get_answer_review_details(payload):
    result = Result.query.filter_by(result_id=payload.get('resultId')).first_or_404()
    questions = Question.query.filter_by(quiz_id=result.quiz_id).all()
    submitted_answers = json.loads(result.submitted_answers or '{}')
    review_data = []
    for q in questions:
        correct_option_text = getattr(q, f"option_{q.correct_answer.lower()}")
        submitted_answer_text = submitted_answers.get(q.question_id, "Not Answered")
        review_data.append({
            "questiontext": q.question_text, "submittedanswer": submitted_answer_text,
            "correctanswer": correct_option_text, "explanation": q.explanation,
            "iscorrect": submitted_answer_text == correct_option_text
        })
    return jsonify({"result": "success", "data": review_data})

# --- Admin Functions ---
def admin_login(payload):
    admin = Admin.query.filter_by(admin_id=payload.get('adminId')).first()
    if admin and admin.check_password(payload.get('password')):
        return jsonify({"result": "success", "data": {"name": admin.name, "role": admin.role, "assignedClasses": admin.assigned_classes}})
    return jsonify({"result": "error", "message": "Invalid credentials"}), 401

def get_admin_dashboard_data(payload):
    stats = {"students": Participant.query.count(), "quizzes": Quiz.query.count(), "results": Result.query.count(), "clubs": Club.query.count()}
    quizzes = [{"quizid": q.quiz_id, "quiztitle": q.quiz_title, "clubid": q.club_id, "status": q.status, "totalquestions": len(q.questions), "timelimitminutes": q.time_limit_minutes, "assignedclasses": q.assigned_classes} for q in Quiz.query.all()]
    clubs = [{"clubid": c.club_id, "clubname": c.club_name, "clublogourl": c.club_logo_url} for c in Club.query.all()]
    participants = [{"Class": p.class_name, "roll": p.roll, "name": p.name, "pin": p.pin} for p in Participant.query.all()]
    all_results = []
    for r in Result.query.order_by(Result.timestamp.desc()).all():
        quiz = Quiz.query.filter_by(quiz_id=r.quiz_id).first()
        participant = Participant.query.filter_by(roll=r.student_roll, class_name=r.student_class).first()
        all_results.append({
            "resultid": r.result_id, "quizid": r.quiz_id, "QuizTitle": quiz.quiz_title if quiz else "N/A",
            "StudentName": participant.name if participant else "N/A", "studentclass": r.student_class,
            "studentroll": r.student_roll, "score": r.score, "timestamp": r.timestamp.isoformat()
        })
    
    admins = []
    settings = {}
    if payload.get('role') == 'SuperAdmin':
        admins = [{"adminid": a.admin_id, "name": a.name, "role": a.role, "assignedclasses": a.assigned_classes} for a in Admin.query.all()]
        settings_db = Setting.query.all()
        settings = {s.key: s.value for s in settings_db}

    return jsonify({"result": "success", "data": {"stats": stats, "quizzes": quizzes, "clubs": clubs, "participants": participants, "allResults": all_results, "admins": admins, "settings": settings, "activityLog": []}})

def get_website_content(payload={}):
    settings_db = Setting.query.all()
    settings = {s.key: s.value for s in settings_db}
    for key in ['allowanswerreview', 'allowmultipleattempts']:
        if key in settings: settings[key] = settings[key].lower() == 'true'
    return jsonify({"result": "success", "data": settings})

def update_website_settings(payload):
    for key, value in payload.items():
        setting = Setting.query.get(key)
        if setting:
            setting.value = str(value)
    db.session.commit()
    return jsonify({"result": "success", "message": "Settings updated."})

def add_participant(payload):
    new_p = Participant(class_name=payload.get('participantClass'), roll=payload.get('participantRoll'), name=payload.get('participantName'), pin=payload.get('participantPin'))
    db.session.add(new_p)
    db.session.commit()
    return jsonify({"result": "success", "message": "Participant added."})

def update_participant(payload):
    p = Participant.query.filter_by(roll=payload.get('originalRoll'), class_name=payload.get('participantClass')).first()
    if p:
        p.roll = payload.get('participantRoll')
        p.name = payload.get('participantName')
        p.pin = payload.get('participantPin')
        db.session.commit()
        return jsonify({"result": "success", "message": "Participant updated."})
    return jsonify({"result": "error", "message": "Participant not found."}), 404

def delete_participant(payload):
    p = Participant.query.filter_by(roll=payload.get('participantRoll'), class_name=payload.get('participantClass')).first()
    if p:
        db.session.delete(p)
        db.session.commit()
        return jsonify({"result": "success", "message": "Participant deleted."})
    return jsonify({"result": "error", "message": "Participant not found."}), 404

def add_club(payload):
    new_c = Club(club_id=f"CLUB{int(datetime.datetime.utcnow().timestamp())}", club_name=payload.get('clubName'), club_logo_url=payload.get('clubLogo'))
    db.session.add(new_c)
    db.session.commit()
    return jsonify({"result": "success", "message": "Club added."})

def update_club(payload):
    c = Club.query.filter_by(club_id=payload.get('clubId')).first()
    if c:
        c.club_name = payload.get('clubName')
        c.club_logo_url = payload.get('clubLogo')
        db.session.commit()
        return jsonify({"result": "success", "message": "Club updated."})
    return jsonify({"result": "error", "message": "Club not found."}), 404

def delete_club(payload):
    c = Club.query.filter_by(club_id=payload.get('clubId')).first()
    if c:
        db.session.delete(c)
        db.session.commit()
        return jsonify({"result": "success", "message": "Club deleted."})
    return jsonify({"result": "error", "message": "Club not found."}), 404

def create_new_quiz(payload):
    new_q = Quiz(
        quiz_id=f"QZ{int(datetime.datetime.utcnow().timestamp())}",
        quiz_title=payload.get('title'), club_id=payload.get('clubId'),
        time_limit_minutes=payload.get('timeLimit'), assigned_classes=payload.get('assignedClasses')
    )
    db.session.add(new_q)
    db.session.commit()
    return jsonify({"result": "success", "data": {"quizId": new_q.quiz_id}})

def get_quiz_for_edit(payload):
    quiz = Quiz.query.filter_by(quiz_id=payload.get('quizId')).first()
    if not quiz: return jsonify({"result": "error", "message": "Quiz not found."}), 404
    quiz_info = {"quizid": quiz.quiz_id, "quiztitle": quiz.quiz_title, "clubid": quiz.club_id, "timelimitminutes": quiz.time_limit_minutes, "assignedclasses": quiz.assigned_classes}
    questions = [{"questionid": q.question_id, "questiontext": q.question_text, "optiona": q.option_a, "optionb": q.option_b, "optionc": q.option_c, "optiond": q.option_d, "correctanswer": q.correct_answer, "explanation": q.explanation} for q in quiz.questions]
    return jsonify({"result": "success", "data": {"quizInfo": quiz_info, "questions": questions}})

def update_quiz(payload):
    quiz = Quiz.query.filter_by(quiz_id=payload.get('quizId')).first()
    if not quiz: return jsonify({"result": "error", "message": "Quiz not found."}), 404
    
    quiz_data = payload.get('quizData', {})
    quiz.quiz_title = quiz_data.get('title')
    quiz.time_limit_minutes = quiz_data.get('timeLimit')
    quiz.club_id = quiz_data.get('clubId')
    quiz.assigned_classes = quiz_data.get('assignedClasses')

    Question.query.filter_by(quiz_id=quiz.quiz_id).delete()

    new_questions = []
    for q_data in payload.get('questions', []):
        new_q = Question(
            question_id=f"QN{int(datetime.datetime.utcnow().timestamp() * 1000)}_{random.randint(100,999)}",
            quiz_id=quiz.quiz_id, question_text=q_data.get('text'),
            option_a=q_data.get('optA'), option_b=q_data.get('optB'),
            option_c=q_data.get('optC'), option_d=q_data.get('optD'),
            correct_answer=q_data.get('correct'), explanation=q_data.get('explanation')
        )
        new_questions.append(new_q)
    db.session.bulk_save_objects(new_questions)
    db.session.commit()
    return jsonify({"result": "success", "message": "Quiz updated."})

def update_quiz_status(payload):
    quiz = Quiz.query.filter_by(quiz_id=payload.get('quizId')).first()
    if quiz:
        quiz.status = payload.get('status')
        db.session.commit()
        return jsonify({"result": "success", "message": "Status updated."})
    return jsonify({"result": "error", "message": "Quiz not found."}), 404

def delete_quiz(payload):
    quiz = Quiz.query.filter_by(quiz_id=payload.get('quizId')).first()
    if quiz:
        db.session.delete(quiz)
        db.session.commit()
        return jsonify({"result": "success", "message": "Quiz deleted."})
    return jsonify({"result": "error", "message": "Quiz not found."}), 404

def add_admin(payload):
    new_admin = Admin(admin_id=payload.get('adminId'), name=payload.get('name'), role=payload.get('role'), assigned_classes=payload.get('assignedClasses'))
    new_admin.set_password(payload.get('password'))
    db.session.add(new_admin)
    db.session.commit()
    return jsonify({"result": "success", "message": "Admin added."})

def update_admin(payload):
    admin = Admin.query.filter_by(admin_id=payload.get('originalAdminId')).first()
    if admin:
        admin.admin_id = payload.get('adminId')
        admin.name = payload.get('name')
        admin.role = payload.get('role')
        admin.assigned_classes = payload.get('assignedClasses')
        if payload.get('password'):
            admin.set_password(payload.get('password'))
        db.session.commit()
        return jsonify({"result": "success", "message": "Admin updated."})
    return jsonify({"result": "error", "message": "Admin not found."}), 404

def delete_admin(payload):
    admin = Admin.query.filter_by(admin_id=payload.get('adminId')).first()
    if admin:
        db.session.delete(admin)
        db.session.commit()
        return jsonify({"result": "success", "message": "Admin deleted."})
    return jsonify({"result": "error", "message": "Admin not found."}), 404

def get_quiz_result_analysis(payload):
    results = Result.query.filter_by(quiz_id=payload.get('quizId')).all()
    if not results: return jsonify({"result": "success", "data": {"summary": {}, "questionAnalysis": []}})
    
    scores = [r.score for r in results]
    summary = {"participants": len(results), "avgScore": round(sum(scores) / len(scores), 2), "highScore": max(scores), "lowScore": min(scores)}
    return jsonify({"result": "success", "data": {"summary": summary, "questionAnalysis": []}})

def get_class_list(payload):
    classes = db.session.query(Participant.class_name).distinct().all()
    class_list = [c[0] for c in classes]
    return jsonify({"result": "success", "data": class_list})

# --- Database Initialization Command ---
@app.cli.command('init-db')
def init_db_command():
    db.drop_all()
    db.create_all()
    print("Database Initializing with sample data...")

    settings_data = [
        Setting(key='portaltitle', value='ওমর কিন্ডারগার্টেন স্কুল (Python)'),
        Setting(key='portalannouncement', value='আয়োজনে: এসোসিয়েশন অফ লিটল প্রোগ্রামার্স'),
        Setting(key='schoollogourl', value='https://i.postimg.cc/sDgPX0zb/school-logo.png'),
        Setting(key='themecolorprimary', value='#3b82f6'),
        Setting(key='loginpagemessage', value='আপনার আইডি এবং পিন ব্যবহার করে লগইন করুন।'),
        Setting(key='dashboardwelcomemessage', value='নিচের তালিকা থেকে আপনার পছন্দের কুইজটি শুরু করুন।'),
        Setting(key='allowanswerreview', value='TRUE'),
    ]
    db.session.bulk_save_objects(settings_data)

    super_admin = Admin(admin_id='superadmin', name='Super Admin', role='SuperAdmin')
    super_admin.set_password('12345')
    db.session.add(super_admin)

    participants_data = [
        Participant(class_name='Class 6', roll='101', name='আবির হাসান', pin='1111'),
        Participant(class_name='Class 7', roll='201', name='সুমি আক্তার', pin='2222'),
    ]
    db.session.bulk_save_objects(participants_data)

    club1 = Club(club_id='CLUB01', club_name='বিজ্ঞান ক্লাব', club_logo_url='https://placehold.co/600x400/22c55e/ffffff?text=Science')
    db.session.add(club1)
    
    db.session.commit()
    print("Clubs, Users, and Settings added.")

    quiz1 = Quiz(quiz_id='QZ001', quiz_title='সাধারণ বিজ্ঞান কুইজ', club_id='CLUB01', status='Active', time_limit_minutes=5)
    db.session.add(quiz1)
    
    db.session.commit()
    print("Quizzes added.")

    questions_data = [
        Question(question_id='QN001', quiz_id='QZ001', question_text='কোন গ্রহকে লাল গ্রহ বলা হয়?', option_a='পৃথিবী', option_b='মঙ্গল', option_c='বৃহস্পতি', option_d='শনি', correct_answer='B'),
        Question(question_id='QN002', quiz_id='QZ001', question_text='বাংলাদেশের জাতীয় ফলের নাম কি?', option_a='আম', option_b='লিচু', option_c='কাঁঠাল', option_d='জাম', correct_answer='C'),
    ]
    db.session.bulk_save_objects(questions_data)

    db.session.commit()
    print("Questions added. Database initialized successfully.")


# --- Main Execution Block ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
