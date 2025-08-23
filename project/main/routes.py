# project/main/routes.py
from flask import Blueprint, render_template, jsonify
from ..models import Setting

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def home():
    return render_template('index.html')

@main_bp.route('/api/settings', methods=['GET'])
def get_public_settings():
    """
    Provides essential public settings for the frontend.
    This endpoint is not protected and is safe to call before login.
    """
    settings_db = Setting.query.all()
    settings = {s.key: s.value for s in settings_db}
    return jsonify(settings)
