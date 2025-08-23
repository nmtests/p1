# project/auth/routes.py
from flask import Blueprint, request, jsonify
from ..models import db, Participant, Admin
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/student/login', methods=['POST'])
def student_login():
    data = request.get_json()
    p = Participant.query.filter_by(class_name=data.get('className'), roll=data.get('roll'), pin=data.get('pin')).first()
    if p:
        identity = {"type": "student", "id": p.id, "name": p.name, "roll": p.roll, "class": p.class_name}
        access_token = create_access_token(identity=identity)
        return jsonify(access_token=access_token, user=identity)
    return jsonify({"message": "Invalid credentials"}), 401

@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    # --- THIS IS THE CHANGE ---
    # We now check for admin_id and pin directly
    admin = Admin.query.filter_by(admin_id=data.get('adminId'), pin=data.get('password')).first()
    
    if admin:
    # --- END OF CHANGE ---
        identity = {"type": "admin", "id": admin.id, "name": admin.name, "role": admin.role}
        access_token = create_access_token(identity=identity)
        return jsonify(access_token=access_token, user=identity)
        
    return jsonify({"message": "Invalid credentials"}), 401
