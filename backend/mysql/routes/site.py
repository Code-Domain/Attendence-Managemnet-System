import re

from flask import Blueprint, jsonify, request

from auth import require_roles
from db import execute, fetch_all

site_bp = Blueprint("site_settings", __name__)

DEFAULTS = {
    "site_name": "Student Attendance",
    "home_title": "Student Attendance Tracker",
    "home_tagline": "A shared attendance workspace for your organization. Manage students, assign classes, record attendance and review reports.",
    "primary_color": "#4f46e5",
    "accent_color": "#10b981",
}


@site_bp.get("/")
def public_settings():
    settings = dict(DEFAULTS)
    for item in fetch_all("SELECT setting_key,setting_value FROM site_settings"):
        if item["setting_key"] in settings:
            settings[item["setting_key"]] = item["setting_value"]
    return jsonify({"success": True, "settings": settings})


@site_bp.get("/admin")
@require_roles("admin")
def admin_settings():
    return public_settings()


@site_bp.put("/admin")
@require_roles("admin")
def update_settings():
    data = request.get_json(silent=True) or {}
    updates = {}
    for key in ("site_name", "home_title", "home_tagline"):
        value = str(data.get(key, "")).strip()
        if not value or len(value) > (500 if key == "home_tagline" else 120):
            return jsonify({"success": False, "message": f"{key.replace('_', ' ').title()} is required and must be within its character limit"}), 400
        updates[key] = value
    for key in ("primary_color", "accent_color"):
        value = str(data.get(key, "")).strip().lower()
        if not re.fullmatch(r"#[0-9a-f]{6}", value):
            return jsonify({"success": False, "message": f"{key.replace('_', ' ').title()} must be a six-digit hex color"}), 400
        updates[key] = value
    for key, value in updates.items():
        execute("INSERT INTO site_settings (setting_key,setting_value) VALUES (%s,%s) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)", (key, value))
    return jsonify({"success": True, "settings": updates})
