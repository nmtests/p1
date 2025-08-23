# run.py
# =================================================================
# Application Entry Point.
# Use 'flask db init', 'flask db migrate', 'flask db upgrade' for database setup.
# Use 'flask init-db' to add sample data.
# Use 'flask run' to start the development server.
# =================================================================

import os
from project import create_app, db
from project.models import Setting, Admin, Participant, Club, Quiz, Question, Badge, Topic, UserBadge
from dotenv import load_dotenv

load_dotenv()

config_name = os.getenv('FLASK_CONFIG', 'development')
app = create_app(config_name)

@app.shell_context_processor
def make_shell_context():
    """Provides shell context for flask shell."""
    return {
        'db': db, 'Setting': Setting, 'Admin': Admin, 'Participant': Participant,
        'Club': Club, 'Quiz': Quiz, 'Question': Question, 'Badge': Badge, 'Topic': Topic, 'UserBadge': UserBadge
    }

@app.cli.command('init-db')
def init_db_command():
    """Initializes the database with sample data."""
    db.drop_all()
    db.create_all()
    print("Database Initializing with sample data...")

    settings_data = [
        Setting(key='portaltitle', value='ওমর কিন্ডারগার্টেন স্কুল (Advanced)'),
        Setting(key='portalannouncement', value='আয়োজনে: এসোসিয়েশন অফ লিটল প্রোগ্রামার্স'),
        Setting(key='schoollogourl', value='https://i.postimg.cc/sDgPX0zb/school-logo.png'),
        Setting(key='themecolorprimary', value='#3b82f6'),
        Setting(key='loginpagemessage', value='আপনার আইডি এবং পিন ব্যবহার করে লগইন করুন।'),
        Setting(key='dashboardwelcomemessage', value='নিচের তালিকা থেকে আপনার পছন্দের কুইজটি শুরু করুন।'),
        Setting(key='allowanswerreview', value='True'),
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
    
    badge1 = Badge(name='First Quiz', description='Complete your first quiz!', icon_url='https://placehold.co/100x100/ffd700/000000?text=1st')
    badge2 = Badge(name='Science Whiz', description='Score 90%+ in a science quiz', icon_url='https://placehold.co/100x100/22c55e/ffffff?text=Sci')
    db.session.add_all([badge1, badge2])

    topic1 = Topic(name='General Knowledge')
    topic2 = Topic(name='Science')
    db.session.add_all([topic1, topic2])

    db.session.commit()
    
    quiz1 = Quiz(quiz_id='QZ001', quiz_title='সাধারণ জ্ঞান কুইজ', club_id='CLUB01', status='Active', time_limit_minutes=5, assigned_classes='All')
    db.session.add(quiz1)
    db.session.commit()

    q1 = Question(question_id='QN001', quiz_id='QZ001', question_text='কোন গ্রহকে লাল গ্রহ বলা হয়?', option_a='পৃথিবী', option_b='মঙ্গল', option_c='বৃহস্পতি', option_d='শনি', correct_answer='B')
    q2 = Question(question_id='QN002', quiz_id='QZ001', question_text='বাংলাদেশের জাতীয় ফলের নাম কি?', option_a='আম', option_b='লিচু', option_c='কাঁঠাল', option_d='জাম', correct_answer='C')
    q1.topics.append(topic2)
    q2.topics.append(topic1)
    db.session.add_all([q1, q2])

    db.session.commit()
    print("Sample data added. Database initialized successfully.")

if __name__ == '__main__':
    app.run()
