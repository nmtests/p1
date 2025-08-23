# project/decorators.py
from functools import wraps
from flask_jwt_extended import get_jwt_identity
from flask import jsonify

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user = get_jwt_identity()
        if current_user.get('type') != 'admin':
            return jsonify(message="Admins only!"), 403
        return fn(*args, **kwargs)
    return wrapper

def super_admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        current_user = get_jwt_identity()
        if current_user.get('role') != 'SuperAdmin':
            return jsonify(message="Super Admins only!"), 403
        return fn(*args, **kwargs)
    return wrapper
