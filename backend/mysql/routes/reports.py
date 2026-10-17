from flask import Blueprint, jsonify, request
from db import fetch_all, fetch_one
from auth import require_roles

reports_bp = Blueprint("reports", __name__)

@reports_bp.before_request
@require_roles("admin")
def admin_only_legacy_reports():
    return None

@reports_bp.get("/daily/<date>")
def daily_report(date):
    summary = fetch_one(
        """SELECT
             COUNT(*) AS total,
             COALESCE(SUM(status='Present'),0) AS present,
             COALESCE(SUM(status='Absent'),0) AS absent
           FROM attendance WHERE attendance_date=%s""",
        (date,)
    )
    total = int(summary["total"] or 0)
    present = int(summary["present"] or 0)
    absent = int(summary["absent"] or 0)
    rate = round((present / total) * 100, 2) if total else 0

    records = fetch_all(
        """SELECT a.student_id, s.name, s.sat_id, s.roll_no,
                  s.branch, s.semester, a.status
           FROM attendance a
           JOIN students s ON s.id=a.student_id
           WHERE a.attendance_date=%s
           ORDER BY s.roll_no, s.name""",
        (date,)
    )
    return jsonify({
        "success": True,
        "date": date,
        "summary": {"total": total, "present": present, "absent": absent, "attendance_rate": rate},
        "records": records
    })

@reports_bp.get("/student/<int:student_id>")
def student_report(student_id):
    start = request.args.get("from")
    end = request.args.get("to")

    student = fetch_one(
        """SELECT id, name, sat_id, roll_no, branch, semester
           FROM students WHERE id=%s""",
        (student_id,)
    )
    if not student:
        return jsonify({"success": False, "message": "Student not found"}), 404

    sql = """SELECT attendance_date, status
             FROM attendance WHERE student_id=%s"""
    params = [student_id]

    if start:
        sql += " AND attendance_date >= %s"
        params.append(start)
    if end:
        sql += " AND attendance_date <= %s"
        params.append(end)

    sql += " ORDER BY attendance_date DESC"
    records = fetch_all(sql, tuple(params))

    total = len(records)
    present = sum(1 for r in records if r["status"] == "Present")
    absent = sum(1 for r in records if r["status"] == "Absent")
    rate = round((present / total) * 100, 2) if total else 0

    return jsonify({
        "success": True,
        "student": student,
        "summary": {
            "total_days": total,
            "present": present,
            "absent": absent,
            "attendance_rate": rate
        },
        "records": records
    })

@reports_bp.get("/range")
def range_report():
    start = request.args.get("from")
    end = request.args.get("to")

    if not start or not end:
        return jsonify({"success": False, "message": "from and to dates are required"}), 400

    rows = fetch_all(
        """SELECT a.attendance_date,
                  COUNT(*) total,
                  SUM(a.status='Present') present,
                  SUM(a.status='Absent') absent
           FROM attendance a
           WHERE a.attendance_date BETWEEN %s AND %s
           GROUP BY a.attendance_date
           ORDER BY a.attendance_date DESC""",
        (start, end)
    )
    return jsonify({"success": True, "from": start, "to": end, "records": rows})
