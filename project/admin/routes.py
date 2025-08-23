
# project/admin/routes.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..models import db, Setting, Participant, Admin, Club, Quiz, Question, Result, Badge, Topic
from ..decorators import admin_required, super_admin_required
import datetime
import random

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/dashboard-data', methods=['GET'])
@jwt_required()
@admin_required
def get_admin_dashboard_data():
    stats = {
        "students": Participant.query.count(),
        "quizzes": Quiz.query.count(),
        "results": Result.query.count(),
        "clubs": Club.query.count()
    }
    
    quizzes = [{
        "quizid": q.quiz_id, "quiztitle": q.quiz_title, "clubid": q.club_id, 
        "status": q.status, "totalquestions": len(q.questions)
    } for q in Quiz.query.all()]

    all_results = [{
        "resultid": r.result_id, "quizid": r.quiz_id, 
        "QuizTitle": r.quiz.quiz_title if r.quiz else "N/A",
        "StudentName": r.participant.name if r.participant else "N/A",
        "studentclass": r.participant.class_name if r.participant else "N/A",
        "studentroll": r.participant.roll if r.participant else "N/A",
        "score": r.score, "timestamp": r.timestamp.isoformat()
    } for r in Result.query.order_by(Result.timestamp.desc()).all()]

    return jsonify({
        "stats": stats,
        "quizzes": quizzes,
        "allResults": all_results
    })

# Participant Management
@admin_bp.route('/participants', methods=['GET', 'POST'])
@jwt_required()
@admin_required
def manage_participants():
    if request.method == 'GET':
        participants = Participant.query.all()
        return jsonify([{
            "id": p.id, "Class": p.class_name, "roll": p.roll, 
            "name": p.name, "pin": p.pin
        } for p in participants])
    
    if request.method == 'POST':
        data = request.get_json()
        new_p = Participant(class_name=data['participantClass'], roll=data['participantRoll'], name=data['participantName'], pin=data['participantPin'])
        db.session.add(new_p)
        db.session.commit()
        return jsonify(message="Participant added successfully"), 201

@admin_bp.route('/participants/<int:participant_id>', methods=['PUT', 'DELETE'])
@jwt_required()
@admin_required
def manage_single_participant(participant_id):
    p = Participant.query.get_or_404(participant_id)
    if request.method == 'PUT':
        data = request.get_json()
        p.class_name = data['participantClass']
        p.roll = data['participantRoll']
        p.name = data['participantName']
        p.pin = data['participantPin']
        db.session.commit()
        return jsonify(message="Participant updated successfully")
    
    if request.method == 'DELETE':
        db.session.delete(p)
        db.session.commit()
        return jsonify(message="Participant deleted successfully")

# Badge Management (SuperAdmin only)
@admin_bp.route('/badges', methods=['GET', 'POST'])
@jwt_required()
@super_admin_required
def manage_badges():
    if request.method == 'GET':
        badges = Badge.query.all()
        return jsonify([{
            "id": b.id, "name": b.name, "description": b.description, "icon_url": b.icon_url
        } for b in badges])
    
    if request.method == 'POST':
        data = request.get_json()
        new_badge = Badge(name=data['name'], description=data['description'], icon_url=data['icon_url'])
        db.session.add(new_badge)
        db.session.commit()
        return jsonify(message="Badge created successfully"), 201

# ... এখানে ক্লাব, কুইজ, টপিক ইত্যাদির জন্য একই রকম CRUD API তৈরি করা হবে ...
# কোড সংক্ষিপ্ত রাখার জন্য এখানে সব দেওয়া হলো না, তবে প্যাটার্নটি একই রকম হবে।
# যেমন: /clubs, /quizzes, /topics ইত্যাদি।

# Website Settings (SuperAdmin only)
@admin_bp.route('/settings', methods=['GET', 'POST'])
@jwt_required()
@super_admin_required
def manage_settings():
    if request.method == 'GET':
        settings_db = Setting.query.all()
        settings = {s.key: s.value for s in settings_db}
        return jsonify(settings)
    
    if request.method == 'POST':
        data = request.get_json()
        for key, value in data.items():
            setting = Setting.query.get(key)
            if setting:
                setting.value = str(value)
        db.session.commit()
        return jsonify(message="Settings updated successfully")
