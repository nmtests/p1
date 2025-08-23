# project/__init__.py
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from .config import config
from .models import db

# Get the absolute path of the project's root directory.
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
migrations_dir = os.path.join(basedir, 'migrations')

cors = CORS()
jwt = JWTManager()
migrate = Migrate(directory=migrations_dir)

def create_app(config_name='development'):
    # --- THIS IS THE FIX ---
    # We define the app with paths relative to the project root.
    app = Flask(__name__,
                template_folder='../templates',
                static_folder='../static')
    # --- END OF FIX ---

    app.config.from_object(config[config_name])

    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    jwt.init_app(app)
    migrate.init_app(app, db)

    from .main.routes import main_bp
    app.register_blueprint(main_bp)

    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from .student.routes import student_bp
    app.register_blueprint(student_bp, url_prefix='/api/student')

    from .admin.routes import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    return app
