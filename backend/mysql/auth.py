from functools import wraps

from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from db import execute, fetch_one

auth_bp = Blueprint("auth", __name__)


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = fetch_one(
        "SELECT id, name, username, teacher_id, phone, email, role, active, password_change_required FROM users WHERE id=%s",
        (user_id,),
    )
    if not user or not user["active"]:
        session.clear()
        return None
    return user


def require_roles(*roles):
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            if not user:
                return jsonify({"success": False, "message": "Please sign in to continue"}), 401
            if user["role"] not in roles:
                return jsonify({"success": False, "message": "You do not have access to this section"}), 403
            if session.get("password_change_required") and request.endpoint != "auth.change_password":
                return jsonify({"success": False, "message": "Change your temporary password before continuing"}), 403
            return view(*args, **kwargs)
        return wrapped
    return decorator


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    identifier = str(data.get("identifier", data.get("email", ""))).strip()
    password = str(data.get("password", ""))
    requested_role = str(data.get("role", "")).strip().lower()
    if not identifier or not password or requested_role not in {"admin", "teacher"}:
        return jsonify({"success": False, "message": "Username or email, password and login type are required"}), 400

    user = fetch_one(
        "SELECT id, name, username, teacher_id, phone, email, password_hash, role, active, password_change_required FROM users WHERE username=%s OR email=%s LIMIT 1",
        (identifier, identifier.lower()),
    )
    if not user or not user["active"] or user["role"] != requested_role or not check_password_hash(user["password_hash"], password):
        return jsonify({"success": False, "message": "Email or password is incorrect for this login"}), 401

    session.clear()
    session["user_id"] = user["id"]
    session["password_change_required"] = bool(user["password_change_required"])
    return jsonify({
        "success": True,
        "user": {key: user[key] for key in ("id", "name", "username", "teacher_id", "phone", "email", "role", "password_change_required")},
    })


@auth_bp.get("/me")
def me():
    user = current_user()
    if not user:
        return jsonify({"success": False, "message": "Not signed in"}), 401
    return jsonify({"success": True, "user": user})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify({"success": True})


@auth_bp.post("/change-password")
@require_roles("admin", "teacher")
def change_password():
    user = current_user()
    data = request.get_json(silent=True) or {}
    old_password = str(data.get("current_password", ""))
    new_password = str(data.get("new_password", ""))
    row = fetch_one("SELECT password_hash FROM users WHERE id=%s", (user["id"],))
    if not old_password or not check_password_hash(row["password_hash"], old_password):
        return jsonify({"success": False, "message": "Current password is incorrect"}), 400
    if len(new_password) < 10:
        return jsonify({"success": False, "message": "New password must be at least 10 characters"}), 400
    execute("UPDATE users SET password_hash=%s,password_change_required=FALSE WHERE id=%s", (generate_password_hash(new_password), user["id"]))
    session["password_change_required"] = False
    return jsonify({"success": True, "message": "Password updated"})
