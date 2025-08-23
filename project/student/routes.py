
# project/student/routes.py
import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, Quiz, Question, Result, Participant, Badge, UserBadge, Topic
import datetime

student_bp = Blueprint('student', __name__)

@student_bp.route('/dashboard-data', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """
    শিক্ষার্থীর ড্যাশবোর্ডের জন্য সক্রিয় কুইজ এবং ফলাফল নিয়ে আসে।
    """
    current_user = get_jwt_identity()
    student_id = current_user['id']
    student_class = current_user['class']
    
    # Get active quizzes
    active_quizzes_query = Quiz.query.filter(
        Quiz.status == 'Active',
        (Quiz.assigned_classes == 'All') | (Quiz.assigned_classes.contains(student_class))
    ).all()
    
    student_results = Result.query.filter_by(participant_id=student_id).all()
    completed_quiz_ids = {res.quiz_id for res in student_results}

    active_quizzes = [{
        "quizid": q.quiz_id, "quiztitle": q.quiz_title, "clubname": q.club.club_name,
        "clublogourl": q.club.club_logo_url, "totalquestions": len(q.questions),
        "timelimitminutes": q.time_limit_minutes, "isCompleted": q.quiz_id in completed_quiz_ids
    } for q in active_quizzes_query]

    # Get student history
    history_list = [{
        "resultId": res.result_id, "quizTitle": res.quiz.quiz_title if res.quiz else "N/A",
        "score": res.score, "totalQuestions": res.total_questions, 
        "timestamp": res.timestamp.isoformat()
    } for res in sorted(student_results, key=lambda x: x.timestamp, reverse=True)]

    # Get student badges
    user_badges = UserBadge.query.filter_by(participant_id=student_id).all()
    badges = [{
        "name": ub.badge.name,
        "description": ub.badge.description,
        "icon_url": ub.badge.icon_url,
        "awarded_on": ub.awarded_on.strftime("%d %b %Y")
    } for ub in user_badges]

    return jsonify({
        "activeQuizzes": active_quizzes,
        "history": history_list,
        "badges": badges
    })

@student_bp.route('/quiz-details/<quiz_id>', methods=['GET'])
@jwt_required()
def get_quiz_details(quiz_id):
    quiz = Quiz.query.filter_by(quiz_id=quiz_id).first_or_404()
    questions_list = [{"QuestionID": q.question_id, "QuestionText": q.question_text, "OptionA": q.option_a, "OptionB": q.option_b, "OptionC": q.option_c, "OptionD": q.option_d} for q in quiz.questions]
    return jsonify(questions_list)

@student_bp.route('/submit-quiz', methods=['POST'])
@jwt_required()
def submit_quiz():
    data = request.get_json()
    current_user = get_jwt_identity()
    student_id = current_user['id']

    quiz_id = data.get('quizId')
    answers = data.get('answers', {})
    
    quiz_questions = Question.query.filter_by(quiz_id=quiz_id).all()
    score = 0
    for q in quiz_questions:
        if str(answers.get(q.question_id)).lower() == str(q.correct_answer).lower():
            score += 1

    new_result = Result(
        result_id=f"RES{int(datetime.datetime.utcnow().timestamp() * 1000)}",
        quiz_id=quiz_id,
        participant_id=student_id,
        score=score,
        total_questions=len(quiz_questions),
        submitted_answers=json.dumps(answers)
    )
    db.session.add(new_result)
    
    # Points and Badge Logic
    participant = Participant.query.get(student_id)
    participant.total_points += score # Add score to total points
    
    # Check for 'First Quiz' badge
    first_quiz_badge = Badge.query.filter_by(name='First Quiz').first()
    if first_quiz_badge:
        existing_badge = UserBadge.query.filter_by(participant_id=student_id, badge_id=first_quiz_badge.id).first()
        if not existing_badge:
            db.session.add(UserBadge(participant_id=student_id, badge_id=first_quiz_badge.id))

    db.session.commit()
    return jsonify({"resultId": new_result.result_id, "score": score, "total": len(quiz_questions)})

@student_bp.route('/review-details/<result_id>', methods=['GET'])
@jwt_required()
def get_answer_review_details(result_id):
    result = Result.query.filter_by(result_id=result_id).first_or_404()
    questions = Question.query.filter_by(quiz_id=result.quiz_id).all()
    submitted_answers = json.loads(result.submitted_answers or '{}')
    review_data = []
    for q in questions:
        submitted_answer = submitted_answers.get(q.question_id, "Not Answered")
        review_data.append({
            "questiontext": q.question_text,
            "submittedanswer": submitted_answer,
            "correctanswer": q.correct_answer,
            "explanation": q.explanation,
            "iscorrect": str(submitted_answer).lower() == str(q.correct_answer).lower()
        })
    return jsonify(review_data)

@student_bp.route('/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    # ক্লাস অনুযায়ী বা সামগ্রিক লিডারবোর্ড দেখানো যেতে পারে
    # আপাতত, সেরা ১০ জন শিক্ষার্থী দেখানো হচ্ছে
    top_students = Participant.query.order_by(Participant.total_points.desc()).limit(10).all()
    leaderboard = [{
        "rank": i + 1,
        "name": p.name,
        "class": p.class_name,
        "points": p.total_points
    } for i, p in enumerate(top_students)]
    return jsonify(leaderboard)
