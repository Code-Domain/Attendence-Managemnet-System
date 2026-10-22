from flask import Blueprint, jsonify, request
from db import fetch_all, fetch_one, execute
from auth import require_roles

attendance_bp = Blueprint("attendance", __name__)
VALID = {"Present", "Absent"}

@attendance_bp.before_request
@require_roles("admin")
def admin_only_legacy_attendance():
    return None

@attendance_bp.post("/")
def mark_attendance():
    data = request.get_json(silent=True) or {}
    student_id = data.get("student_id", data.get("studentId"))
    date = data.get("date", data.get("attendance_date"))
    status = data.get("status")

    if not student_id or not date or status not in VALID:
        return jsonify({
            "success": False,
            "message": "student_id, date and status (Present/Absent) are required"
        }), 400

    student = fetch_one("SELECT id FROM students WHERE id=%s", (student_id,))
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    execute(
        """INSERT INTO attendance (student_id, attendance_date, status)
           VALUES (%s,%s,%s)
           ON DUPLICATE KEY UPDATE status=VALUES(status), updated_at=CURRENT_TIMESTAMP""",
        (student_id, date, status)
    )
    return jsonify({"success": True, "message": "Attendance saved successfully"})

@attendance_bp.post("/bulk")
def bulk_attendance():
    data = request.get_json(silent=True) or {}
    date = data.get("date")
    records = data.get("attendance", [])

    if not date or not isinstance(records, list) or not records:
        return jsonify({"success": False, "message": "date and attendance array are required"}), 400

    saved = 0
    for item in records:
        student_id = item.get("student_id", item.get("studentId"))
        status = item.get("status")
        if student_id and status in VALID:
            execute(
                """INSERT INTO attendance (student_id, attendance_date, status)
                   VALUES (%s,%s,%s)
                   ON DUPLICATE KEY UPDATE status=VALUES(status), updated_at=CURRENT_TIMESTAMP""",
                (student_id, date, status)
            )
            saved += 1

    return jsonify({"success": True, "message": "Attendance submitted", "saved": saved})

@attendance_bp.get("/date/<date>")
def attendance_by_date(date):
    rows = fetch_all(
        """SELECT a.id, a.student_id, s.name, s.sat_id, s.roll_no,
                  s.branch, s.semester, a.attendance_date, a.status
           FROM attendance a
           JOIN students s ON s.id=a.student_id
           WHERE a.attendance_date=%s
           ORDER BY s.roll_no, s.name""",
        (date,)
    )
    return jsonify({"success": True, "date": date, "records": rows})

@attendance_bp.delete("/date/<date>")
def delete_attendance_by_date(date):
    _, count = execute("DELETE FROM attendance WHERE attendance_date=%s", (date,))
    return jsonify({"success": True, "date": date, "deleted": count})

@attendance_bp.get("/range")
def attendance_by_range():
    start = request.args.get("from", "").strip()
    end = request.args.get("to", "").strip()
    if not start or not end or start > end:
        return jsonify({"success": False, "message": "Valid from and to dates are required"}), 400

    rows = fetch_all(
        """SELECT a.id, a.student_id, s.name, s.sat_id, s.roll_no,
                  s.branch, s.semester, a.attendance_date, a.status
           FROM attendance a
           JOIN students s ON s.id=a.student_id
           WHERE a.attendance_date BETWEEN %s AND %s
           ORDER BY a.attendance_date DESC, s.roll_no, s.name""",
        (start, end)
    )
    return jsonify({"success": True, "from": start, "to": end, "records": rows})

@attendance_bp.get("/student/<int:student_id>")
def student_attendance(student_id):
    rows = fetch_all(
        """SELECT id, attendance_date, status
           FROM attendance WHERE student_id=%s
           ORDER BY attendance_date DESC""",
        (student_id,)
    )
    return jsonify({"success": True, "records": rows})
