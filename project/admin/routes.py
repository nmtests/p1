# project/admin/routes.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from ..models import db, Setting, Participant, Admin, Club, Quiz, Question, Result, Badge, Topic
from ..decorators import admin_required, super_admin_required
import datetime, random

admin_bp = Blueprint('admin', __name__)

def to_dict(obj):
    if obj is None: return None
    return {c.key: getattr(obj, c.key) for c in db.inspect(obj).mapper.column_attrs}

@admin_bp.route('/all-data', methods=['GET'])
@jwt_required()
@admin_required
def get_all_admin_data():
    """Fetches all necessary data for the admin panel in one go."""
    participants = [to_dict(p) for p in Participant.query.order_by(Participant.class_name, Participant.roll).all()]
    clubs = [to_dict(c) for c in Club.query.order_by(Club.club_name).all()]
    quizzes = [to_dict(q) for q in Quiz.query.order_by(Quiz.quiz_title).all()]
    badges = [to_dict(b) for b in Badge.query.order_by(Badge.name).all()]
    topics = [to_dict(t) for t in Topic.query.order_by(Topic.name).all()]
    
    stats = {
        "students": len(participants), "quizzes": len(quizzes),
        "clubs": len(clubs), "results": Result.query.count()
    }

    return jsonify({
        "participants": participants, "clubs": clubs, "quizzes": quizzes,
        "badges": badges, "topics": topics, "stats": stats
    })

# CRUD for Participants
@admin_bp.route('/participants', methods=['POST'])
@jwt_required()
@admin_required
def add_participant():
    data = request.get_json()
    new_p = Participant(class_name=data['class_name'], roll=data['roll'], name=data['name'], pin=data['pin'])
    db.session.add(new_p)
    db.session.commit()
    return jsonify(to_dict(new_p)), 201

@admin_bp.route('/participants/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
@admin_required
def manage_participant(id):
    p = Participant.query.get_or_404(id)
    if request.method == 'PUT':
        data = request.get_json()
        p.class_name = data['class_name']
        p.roll = data['roll']
        p.name = data['name']
        p.pin = data['pin']
        db.session.commit()
        return jsonify(to_dict(p))
    elif request.method == 'DELETE':
        db.session.delete(p)
        db.session.commit()
        return jsonify(message="Participant deleted")

# CRUD for Clubs
@admin_bp.route('/clubs', methods=['POST'])
@jwt_required()
@admin_required
def add_club():
    data = request.get_json()
    new_c = Club(club_id=f"CLUB{int(datetime.datetime.utcnow().timestamp())}", club_name=data['club_name'], club_logo_url=data['club_logo_url'])
    db.session.add(new_c)
    db.session.commit()
    return jsonify(to_dict(new_c)), 201

@admin_bp.route('/clubs/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
@admin_required
def manage_club(id):
    c = Club.query.get_or_404(id)
    if request.method == 'PUT':
        data = request.get_json()
        c.club_name = data['club_name']
        c.club_logo_url = data['club_logo_url']
        db.session.commit()
        return jsonify(to_dict(c))
    elif request.method == 'DELETE':
        if Quiz.query.filter_by(club_id=c.club_id).count() > 0:
            return jsonify(message="Cannot delete club with active quizzes"), 400
        db.session.delete(c)
        db.session.commit()
        return jsonify(message="Club deleted")

# CRUD for Badges
@admin_bp.route('/badges', methods=['POST'])
@jwt_required()
@super_admin_required
def add_badge():
    data = request.get_json()
    new_b = Badge(name=data['name'], description=data['description'], icon_url=data['icon_url'])
    db.session.add(new_b)
    db.session.commit()
    return jsonify(to_dict(new_b)), 201

@admin_bp.route('/badges/<int:id>', methods=['PUT', 'DELETE'])
@jwt_required()
@super_admin_required
def manage_badge(id):
    b = Badge.query.get_or_404(id)
    if request.method == 'PUT':
        data = request.get_json()
        b.name = data['name']
        b.description = data['description']
        b.icon_url = data['icon_url']
        db.session.commit()
        return jsonify(to_dict(b))
    elif request.method == 'DELETE':
        db.session.delete(b)
        db.session.commit()
        return jsonify(message="Badge deleted")

# Website Settings (Update only)
@admin_bp.route('/settings', methods=['POST'])
@jwt_required()
@super_admin_required
def update_settings():
    data = request.get_json()
    for key, value in data.items():
        setting = Setting.query.get(key)
        if setting: setting.value = str(value)
        else: db.session.add(Setting(key=key, value=str(value)))
    db.session.commit()
    return jsonify(message="Settings updated")
