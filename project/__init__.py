# project/__init__.py
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from .config import config
from .models import db

# Initialize extensions
cors = CORS()
jwt = JWTManager()
migrate = Migrate()

def create_app(config_name='development'):
    """
    Application Factory Function
    """
    app = Flask(__name__,
                template_folder='../../templates',
                static_folder='../../static')

    # Load configuration
    app.config.from_object(config[config_name])

    # Initialize extensions with app
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    jwt.init_app(app)
    migrate.init_app(app, db)

    # Register Blueprints
    from .auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from .student.routes import student_bp
    app.register_blueprint(student_bp, url_prefix='/api/student')

    from .admin.routes import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    from .main.routes import main_bp
    app.register_blueprint(main_bp)

    return app
