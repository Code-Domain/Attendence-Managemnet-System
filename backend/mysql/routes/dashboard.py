from flask import Blueprint, jsonify, request
from db import fetch_one
from auth import require_roles

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.before_request
@require_roles("admin")
def admin_only_legacy_dashboard():
    return None

@dashboard_bp.get("/summary")
def dashboard_summary():
    date = request.args.get("date")
    if not date:
        return jsonify({"success": False, "message": "date is required"}), 400

    students = fetch_one("SELECT COUNT(*) AS total FROM students")
    attendance = fetch_one(
        """SELECT
             COUNT(*) AS marked,
             COALESCE(SUM(status='Present'),0) AS present,
             COALESCE(SUM(status='Absent'),0) AS absent
           FROM attendance WHERE attendance_date=%s""",
        (date,)
    )

    total_students = int(students["total"] or 0)
    marked = int(attendance["marked"] or 0)
    present = int(attendance["present"] or 0)
    absent = int(attendance["absent"] or 0)

    return jsonify({
        "success": True,
        "date": date,
        "students": total_students,
        "marked": marked,
        "unmarked": max(total_students - marked, 0),
        "present": present,
        "absent": absent,
        "attendance_rate": round((present / marked) * 100, 2) if marked else 0
    })
