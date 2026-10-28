import getpass
import re

from flask import Flask, jsonify, request
from flask_cors import CORS
from config import FLASK_HOST, FLASK_PORT, SECRET_KEY, FRONTEND_ORIGINS, SESSION_COOKIE_SAMESITE, SESSION_COOKIE_SECURE
from routes.students import students_bp
from routes.attendance import attendance_bp
from routes.reports import reports_bp
from routes.dashboard import dashboard_bp
from routes.portal import admin_bp, teacher_bp
from routes.site import site_bp
from auth import auth_bp
from db import execute
from werkzeug.security import generate_password_hash
from db import fetch_one
from mailer import MailConfigurationError, send_contact_emails

app = Flask(__name__)
app.config.update(
    SECRET_KEY=SECRET_KEY,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE=SESSION_COOKIE_SECURE,
)
CORS(app, origins=FRONTEND_ORIGINS, supports_credentials=True)

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(teacher_bp, url_prefix="/api/teacher")
app.register_blueprint(site_bp, url_prefix="/api/site-settings")
app.register_blueprint(students_bp, url_prefix="/api/students")
app.register_blueprint(attendance_bp, url_prefix="/api/attendance")
app.register_blueprint(reports_bp, url_prefix="/api/reports")
app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")


@app.cli.command("create-admin")
def create_admin_command():
    """Create the first administrator account after applying the portal migration."""
    if fetch_one("SELECT id FROM users WHERE role='admin' LIMIT 1"):
        print("An administrator already exists. Use the admin panel to manage accounts.")
        return
    name = input("Admin name: ").strip()
    username = input("Admin username: ").strip()
    email = input("Admin email (optional): ").strip().lower() or None
    password = getpass.getpass("Admin password (at least 10 characters): ")
    confirmation = getpass.getpass("Confirm password: ")
    if not name or not username or len(password) < 10 or password != confirmation:
        raise SystemExit("Name and username are required; password must be 10+ characters and both entries must match.")
    execute(
        "INSERT INTO users (name,username,email,password_hash,role) VALUES (%s,%s,%s,%s,'admin')",
        (name, username, email, generate_password_hash(password)),
    )
    print("Administrator account created. Keep its password private.")

@app.get("/")
def home():
    return jsonify({
        "success": True,
        "message": "Student Attendance Reporting System backend is running"
    })

@app.get("/api/health")
def health():
    return jsonify({"success": True, "status": "online"})

@app.post("/api/contact")
def contact():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    subject = str(data.get("subject", "")).strip()
    message = str(data.get("message", "")).strip()
    if not all((name, email, subject, message)):
        return jsonify({"success": False, "message": "All contact fields are required"}), 400
    if len(name) > 150 or len(email) > 254 or len(subject) > 200 or len(message) > 10000:
        return jsonify({"success": False, "message": "One or more fields are too long"}), 400
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify({"success": False, "message": "Enter a valid email address"}), 400
    execute(
        "INSERT INTO contact_messages (name, email, subject, message) VALUES (%s,%s,%s,%s)",
        (name, email, subject, message)
    )
    try:
        send_contact_emails(name, email, subject, message)
    except MailConfigurationError:
        app.logger.error("Contact email is not configured; submission was stored but no email was sent")
        return jsonify({"success": False, "message": "Your message was saved, but email confirmation is not available right now. Please try again later."}), 503
    except Exception:
        app.logger.exception("Could not send contact-form email")
        return jsonify({"success": False, "message": "Your message was saved, but email delivery failed. Please try again later."}), 503
    return jsonify({"success": True, "message": "Message received. A confirmation email has been sent to you."}), 201

@app.errorhandler(404)
def not_found(_):
    return jsonify({"success": False, "message": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(_):
    return jsonify({"success": False, "message": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=True)
