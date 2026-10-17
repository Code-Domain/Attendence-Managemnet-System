from flask import Blueprint, jsonify, request
from mysql.connector import IntegrityError
from db import fetch_all, fetch_one, execute
from auth import require_roles

students_bp = Blueprint("students", __name__)

@students_bp.before_request
@require_roles("admin")
def admin_only_students():
    return None

def clean_student(data):
    return {
        "name": str(data.get("name", "")).strip(),
        "sat_id": str(data.get("sat_id", data.get("satId", ""))).strip(),
        "roll_no": str(data.get("roll_no", data.get("rollNo", ""))).strip(),
        "branch": str(data.get("branch", "")).strip(),
        "semester": str(data.get("semester", "")).strip(),
    }

@students_bp.get("/")
def list_students():
    q = request.args.get("q", "").strip()
    branch = request.args.get("branch", "").strip()
    semester = request.args.get("semester", "").strip()

    sql = """SELECT id, name, sat_id, roll_no, branch, semester, created_at, updated_at
             FROM students WHERE 1=1"""
    params = []

    if q:
        sql += " AND (name LIKE %s OR sat_id LIKE %s OR roll_no LIKE %s)"
        like = f"%{q}%"
        params += [like, like, like]
    if branch:
        sql += " AND branch = %s"
        params.append(branch)
    if semester:
        sql += " AND semester = %s"
        params.append(semester)

    sql += " ORDER BY roll_no ASC, name ASC"
    rows = fetch_all(sql, tuple(params))
    return jsonify({"success": True, "count": len(rows), "students": rows})

@students_bp.get("/<int:student_id>")
def get_student(student_id):
    row = fetch_one(
        """SELECT id, name, sat_id, roll_no, branch, semester, created_at, updated_at
           FROM students WHERE id=%s""",
        (student_id,)
    )
    if not row:
        return jsonify({"success": False, "message": "Student not found"}), 404
    return jsonify({"success": True, "student": row})

@students_bp.post("/")
def create_student():
    data = clean_student(request.get_json(silent=True) or {})
    missing = [k for k, v in data.items() if not v]
    if missing:
        return jsonify({"success": False, "message": "Required fields missing", "fields": missing}), 400

    try:
        student_id, _ = execute(
            """INSERT INTO students (name, sat_id, roll_no, branch, semester)
               VALUES (%s,%s,%s,%s,%s)""",
            (data["name"], data["sat_id"], data["roll_no"], data["branch"], data["semester"])
        )
        return jsonify({"success": True, "message": "Student added successfully", "student_id": student_id}), 201
    except IntegrityError as e:
        return jsonify({
            "success": False,
            "message": "SAT ID or Roll Number already exists",
            "details": str(e)
        }), 409

@students_bp.put("/<int:student_id>")
def update_student(student_id):
    data = clean_student(request.get_json(silent=True) or {})
    missing = [k for k, v in data.items() if not v]
    if missing:
        return jsonify({"success": False, "message": "Required fields missing", "fields": missing}), 400

    try:
        _, count = execute(
            """UPDATE students
               SET name=%s, sat_id=%s, roll_no=%s, branch=%s, semester=%s
               WHERE id=%s""",
            (data["name"], data["sat_id"], data["roll_no"], data["branch"], data["semester"], student_id)
        )
        if count == 0:
            return jsonify({"success": False, "message": "Student not found"}), 404
        return jsonify({"success": True, "message": "Student updated successfully"})
    except IntegrityError as e:
        return jsonify({"success": False, "message": "SAT ID or Roll Number already exists", "details": str(e)}), 409

@students_bp.delete("/<int:student_id>")
def delete_student(student_id):
    _, count = execute("DELETE FROM students WHERE id=%s", (student_id,))
    if count == 0:
        return jsonify({"success": False, "message": "Student not found"}), 404
    return jsonify({"success": True, "message": "Student deleted successfully"})
