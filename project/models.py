# project/models.py
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

db = SQLAlchemy()

# Association Table for Many-to-Many relationship
question_topic = db.Table('question_topic',
    db.Column('question_id', db.Integer, db.ForeignKey('question.id'), primary_key=True),
    db.Column('topic_id', db.Integer, db.ForeignKey('topic.id'), primary_key=True)
)

class Badge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255))
    icon_url = db.Column(db.String(300))

class UserBadge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participant.id'), nullable=False)
    badge_id = db.Column(db.Integer, db.ForeignKey('badge.id'), nullable=False)
    awarded_on = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    badge = db.relationship('Badge', backref='user_badges')

class Topic(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class Setting(db.Model):
    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.String(500))

class Participant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    class_name = db.Column(db.String(50), nullable=False)
    roll = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    pin = db.Column(db.String(50), nullable=False)
    total_points = db.Column(db.Integer, default=0)
    badges = db.relationship('UserBadge', backref='participant', lazy=True)
    __table_args__ = (db.UniqueConstraint('class_name', 'roll', name='_class_roll_uc'),)

class Admin(db.Model):
    # --- THIS IS THE CHANGE ---
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.String(80), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    pin = db.Column(db.String(50), nullable=False) # Using a simple PIN instead of a hash
    role = db.Column(db.String(50), nullable=False, default='Teacher')
    # Removed set_password and check_password methods
    # --- END OF CHANGE ---

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
    question_type = db.Column(db.String(50), default='multiple_choice')
    option_a = db.Column(db.String(200))
    option_b = db.Column(db.String(200))
    option_c = db.Column(db.String(200))
    option_d = db.Column(db.String(200))
    correct_answer = db.Column(db.String(200), nullable=False)
    explanation = db.Column(db.Text, nullable=True)
    topics = db.relationship('Topic', secondary=question_topic, lazy='subquery', backref=db.backref('questions', lazy=True))

class Result(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.String(50), unique=True, nullable=False)
    quiz_id = db.Column(db.String(50), db.ForeignKey('quiz.quiz_id'), nullable=False)
    participant_id = db.Column(db.Integer, db.ForeignKey('participant.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    submitted_answers = db.Column(db.Text)
    participant = db.relationship('Participant', backref='results')
    quiz = db.relationship('Quiz', backref='results')
