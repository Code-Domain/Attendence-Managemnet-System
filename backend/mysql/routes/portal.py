from datetime import date, datetime

from flask import Blueprint, jsonify, request
from mysql.connector import IntegrityError
from werkzeug.security import generate_password_hash

from auth import current_user, require_roles
from db import execute, fetch_all, fetch_one, get_db

admin_bp = Blueprint("admin_portal", __name__)
teacher_bp = Blueprint("teacher_portal", __name__)


def error(message, status=400):
    return jsonify({"success": False, "message": message}), status


def student_payload(data):
    return {
        "name": str(data.get("name", "")).strip(),
        "sat_id": str(data.get("registration_no", data.get("sat_id", ""))).strip(),
        "roll_no": str(data.get("roll_no", "")).strip().upper(),
        "branch": str(data.get("branch", "")).strip().upper(),
        "semester": str(data.get("semester", "")).strip(),
        "batch": str(data.get("batch", "")).strip(),
    }


def subject_payload(data):
    name = str(data.get("name", "")).strip()
    branch = str(data.get("branch", "")).strip().upper()
    semester = str(data.get("semester", "")).strip()
    batch = str(data.get("batch", "")).strip()
    mode = str(data.get("range_mode", "full")).lower()
    start = data.get("roll_start")
    end = data.get("roll_end")
    teacher_ids = data.get("teacher_ids", [])
    if not all((name, branch, semester, batch)):
        return None, None, "Subject, branch, semester and batch are required"
    if mode not in {"full", "custom"}:
        return None, None, "Choose a full cohort or custom roll number range"
    if mode == "custom":
        try:
            start, end = int(start), int(end)
        except (TypeError, ValueError):
            return None, None, "Enter numeric start and end roll numbers for the custom range"
        if start < 0 or end < start or end > 99999:
            return None, None, "The custom roll number range is invalid"
    else:
        start = end = None
    if not isinstance(teacher_ids, list):
        return None, None, "Teacher assignments must be a list"
    try:
        teacher_ids = sorted({int(value) for value in teacher_ids})
    except (TypeError, ValueError):
        return None, None, "One or more selected teachers are invalid"
    return {
        "name": name, "branch": branch, "semester": semester, "batch": batch,
        "range_mode": mode, "roll_start": start, "roll_end": end,
    }, teacher_ids, None


def cohort_sql(subject_id, teacher_id=None):
    sql = """SELECT s.id, s.name, s.sat_id, s.roll_no, s.branch, s.semester, s.batch
             FROM students s JOIN subjects sub ON sub.branch COLLATE utf8mb4_unicode_ci=s.branch COLLATE utf8mb4_unicode_ci
               AND sub.semester COLLATE utf8mb4_unicode_ci=s.semester COLLATE utf8mb4_unicode_ci
               AND sub.batch COLLATE utf8mb4_unicode_ci=s.batch COLLATE utf8mb4_unicode_ci
             WHERE sub.id=%s AND (sub.range_mode='full' OR
               CAST(SUBSTRING_INDEX(s.roll_no, '-', -1) AS UNSIGNED)
                 BETWEEN sub.roll_start AND sub.roll_end)"""
    params = [subject_id]
    if teacher_id is not None:
        sql += " AND EXISTS (SELECT 1 FROM subject_assignments sa WHERE sa.subject_id=sub.id AND sa.teacher_id=%s)"
        params.append(teacher_id)
    sql += " ORDER BY s.roll_no, s.name"
    return sql, tuple(params)


def user_is_assigned(user_id, subject_id):
    return bool(fetch_one(
        "SELECT 1 AS ok FROM subject_assignments WHERE teacher_id=%s AND subject_id=%s",
        (user_id, subject_id),
    ))


@admin_bp.get("/summary")
@require_roles("admin")
def admin_summary():
    counts = fetch_one("""SELECT
        (SELECT COUNT(*) FROM students) AS students,
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM users WHERE role='teacher' AND active=1) AS teachers""")
    return jsonify({"success": True, **counts})


@admin_bp.get("/students")
@require_roles("admin")
def admin_students():
    q = request.args.get("q", "").strip()
    sql = "SELECT id, name, sat_id, roll_no, branch, semester, batch FROM students"
    params = ()
    if q:
        like = f"%{q}%"
        sql += " WHERE name LIKE %s OR sat_id LIKE %s OR roll_no LIKE %s"
        params = (like, like, like)
    sql += " ORDER BY batch DESC, branch, semester, roll_no"
    return jsonify({"success": True, "students": fetch_all(sql, params)})


@admin_bp.post("/students")
@require_roles("admin")
def create_student():
    data = student_payload(request.get_json(silent=True) or {})
    if not all(data.values()):
        return error("Name, registration number, roll number, branch, semester and batch are required")
    try:
        student_id, _ = execute(
            "INSERT INTO students (name,sat_id,roll_no,branch,semester,batch) VALUES (%s,%s,%s,%s,%s,%s)",
            tuple(data.values()),
        )
        return jsonify({"success": True, "id": student_id, "message": "Student added"}), 201
    except IntegrityError:
        return error("Registration number or roll number already exists", 409)


@admin_bp.put("/students/<int:student_id>")
@require_roles("admin")
def update_student(student_id):
    data = student_payload(request.get_json(silent=True) or {})
    if not all(data.values()):
        return error("All student fields are required")
    try:
        _, changed = execute(
            "UPDATE students SET name=%s,sat_id=%s,roll_no=%s,branch=%s,semester=%s,batch=%s WHERE id=%s",
            (*data.values(), student_id),
        )
        if not fetch_one("SELECT id FROM students WHERE id=%s", (student_id,)):
            return error("Student not found", 404)
        return jsonify({"success": True, "message": "Student updated", "changed": changed})
    except IntegrityError:
        return error("Registration number or roll number already exists", 409)


@admin_bp.delete("/students/<int:student_id>")
@require_roles("admin")
def remove_student(student_id):
    _, count = execute("DELETE FROM students WHERE id=%s", (student_id,))
    if not count:
        return error("Student not found", 404)
    return jsonify({"success": True})


@admin_bp.get("/teachers")
@require_roles("admin")
def list_teachers():
    rows = fetch_all("""SELECT u.id,u.name,u.username,u.teacher_id,u.phone,u.email,u.active,
        COUNT(sa.subject_id) AS subject_count
        FROM users u LEFT JOIN subject_assignments sa ON sa.teacher_id=u.id
        WHERE u.role='teacher' GROUP BY u.id ORDER BY u.name""")
    return jsonify({"success": True, "teachers": rows})


@admin_bp.post("/teachers")
@require_roles("admin")
def create_teacher():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    teacher_id = str(data.get("teacher_id", "")).strip()
    phone = str(data.get("phone", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    if not all((name, teacher_id, phone, email)) or len(password) < 10:
        return error("Name, teacher ID, phone, email and a password of at least 10 characters are required")
    try:
        user_id, _ = execute(
            "INSERT INTO users (name,username,teacher_id,phone,email,password_hash,role) VALUES (%s,%s,%s,%s,%s,%s,'teacher')",
            (name, teacher_id, teacher_id, phone, email, generate_password_hash(password)),
        )
        return jsonify({"success": True, "id": user_id, "message": "Teacher account created"}), 201
    except IntegrityError:
        return error("That teacher ID or email is already in use", 409)


@admin_bp.patch("/teachers/<int:teacher_id>")
@require_roles("admin")
def update_teacher(teacher_id):
    data = request.get_json(silent=True) or {}
    if not fetch_one("SELECT id FROM users WHERE id=%s AND role='teacher'", (teacher_id,)):
        return error("Teacher not found", 404)
    password = str(data.get("password", ""))
    if password and len(password) < 10:
        return error("Password must be at least 10 characters")
    if "active" in data:
        execute("UPDATE users SET active=%s WHERE id=%s AND role='teacher'", (bool(data["active"]), teacher_id))
    if password:
        execute("UPDATE users SET password_hash=%s,password_change_required=TRUE WHERE id=%s AND role='teacher'", (generate_password_hash(password), teacher_id))
    return jsonify({"success": True, "message": "Teacher account updated"})


@admin_bp.put("/teachers/<int:teacher_id>/profile")
@require_roles("admin")
def edit_teacher_profile(teacher_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    staff_code = str(data.get("teacher_id", "")).strip()
    phone = str(data.get("phone", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    if not all((name, staff_code, phone, email)):
        return error("Name, teacher ID, phone and email are required")
    try:
        _, changed = execute("UPDATE users SET name=%s,teacher_id=%s,phone=%s,email=%s,username=%s WHERE id=%s AND role='teacher'",
                             (name, staff_code, phone, email, staff_code, teacher_id))
    except IntegrityError:
        return error("That teacher ID, username or email is already in use", 409)
    if not fetch_one("SELECT id FROM users WHERE id=%s AND role='teacher'", (teacher_id,)):
        return error("Teacher not found", 404)
    return jsonify({"success": True, "changed": changed, "message": "Teacher profile updated"})


@admin_bp.delete("/teachers/<int:teacher_id>")
@require_roles("admin")
def delete_teacher(teacher_id):
    _, count = execute("DELETE FROM users WHERE id=%s AND role='teacher'", (teacher_id,))
    if not count:
        return error("Teacher not found", 404)
    return jsonify({"success": True, "message": "Teacher removed; historical attendance is retained"})


@admin_bp.get("/subjects")
@require_roles("admin")
def list_subjects():
    subjects = fetch_all("""SELECT id,name,semester,branch,batch,range_mode,roll_start,roll_end
        FROM subjects ORDER BY batch DESC,branch,semester,name""")
    for subject in subjects:
        subject["teachers"] = fetch_all("""SELECT u.id,u.name,u.teacher_id FROM users u
            JOIN subject_assignments sa ON sa.teacher_id=u.id WHERE sa.subject_id=%s AND u.active=1 ORDER BY u.name""", (subject["id"],))
    return jsonify({"success": True, "subjects": subjects})


@admin_bp.post("/subjects")
@require_roles("admin")
def create_subject():
    data, teacher_ids, problem = subject_payload(request.get_json(silent=True) or {})
    if problem:
        return error(problem)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("INSERT INTO subjects (name,branch,semester,batch,range_mode,roll_start,roll_end) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                    (data["name"],data["branch"],data["semester"],data["batch"],data["range_mode"],data["roll_start"],data["roll_end"]))
        subject_id = cur.lastrowid
        for teacher_id in teacher_ids:
            cur.execute("INSERT INTO subject_assignments (subject_id,teacher_id) SELECT %s,id FROM users WHERE id=%s AND role='teacher' AND active=1", (subject_id, teacher_id))
            if cur.rowcount != 1:
                raise ValueError("Every selected teacher must be an active teacher account")
        conn.commit()
        return jsonify({"success": True, "id": subject_id, "message": "Subject created and assigned"}), 201
    except IntegrityError:
        conn.rollback()
        return error("That subject already exists for this branch, semester and batch", 409)
    except ValueError as exc:
        conn.rollback()
        return error(str(exc))
    finally:
        conn.close()


@admin_bp.put("/subjects/<int:subject_id>")
@require_roles("admin")
def update_subject(subject_id):
    data, teacher_ids, problem = subject_payload(request.get_json(silent=True) or {})
    if problem:
        return error(problem)
    if not fetch_one("SELECT id FROM subjects WHERE id=%s", (subject_id,)):
        return error("Subject not found", 404)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("UPDATE subjects SET name=%s,branch=%s,semester=%s,batch=%s,range_mode=%s,roll_start=%s,roll_end=%s WHERE id=%s",
                    (data["name"], data["branch"], data["semester"], data["batch"], data["range_mode"], data["roll_start"], data["roll_end"], subject_id))
        cur.execute("DELETE FROM subject_assignments WHERE subject_id=%s", (subject_id,))
        for teacher_id in teacher_ids:
            cur.execute("INSERT INTO subject_assignments (subject_id,teacher_id) SELECT %s,id FROM users WHERE id=%s AND role='teacher' AND active=1", (subject_id, teacher_id))
            if cur.rowcount != 1:
                raise ValueError("Every selected teacher must be an active teacher account")
        conn.commit()
        return jsonify({"success": True, "message": "Subject updated"})
    except IntegrityError:
        conn.rollback()
        return error("That subject already exists for this branch, semester and batch", 409)
    except ValueError as exc:
        conn.rollback()
        return error(str(exc))
    finally:
        conn.close()


@admin_bp.put("/subjects/<int:subject_id>/teachers")
@require_roles("admin")
def assign_teachers(subject_id):
    data = request.get_json(silent=True) or {}
    ids = data.get("teacher_ids", [])
    if not isinstance(ids, list):
        return error("teacher_ids must be a list")
    try:
        ids = sorted({int(value) for value in ids})
    except (TypeError, ValueError):
        return error("Invalid teacher selection")
    if not fetch_one("SELECT id FROM subjects WHERE id=%s", (subject_id,)):
        return error("Subject not found", 404)
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM subject_assignments WHERE subject_id=%s", (subject_id,))
        for teacher_id in ids:
            cur.execute("INSERT INTO subject_assignments (subject_id,teacher_id) SELECT %s,id FROM users WHERE id=%s AND role='teacher' AND active=1", (subject_id, teacher_id))
            if cur.rowcount != 1:
                raise ValueError("Every selected teacher must be an active teacher account")
        conn.commit()
    except ValueError as exc:
        conn.rollback()
        return error(str(exc))
    finally:
        conn.close()
    return jsonify({"success": True, "message": "Teacher assignments saved"})


@admin_bp.delete("/subjects/<int:subject_id>")
@require_roles("admin")
def delete_subject(subject_id):
    _, count = execute("DELETE FROM subjects WHERE id=%s", (subject_id,))
    if not count:
        return error("Subject not found", 404)
    return jsonify({"success": True})


@teacher_bp.get("/subjects")
@require_roles("teacher")
def my_subjects():
    user = current_user()
    rows = fetch_all("""SELECT s.id,s.name,s.semester,s.branch,s.batch,s.range_mode,s.roll_start,s.roll_end
        FROM subjects s JOIN subject_assignments a ON a.subject_id=s.id
        WHERE a.teacher_id=%s ORDER BY s.semester,s.name""", (user["id"],))
    return jsonify({"success": True, "subjects": rows})


@teacher_bp.get("/subjects/<int:subject_id>/students")
@require_roles("teacher")
def subject_students(subject_id):
    user = current_user()
    sql, params = cohort_sql(subject_id, user["id"])
    if not user_is_assigned(user["id"], subject_id):
        return error("Subject is not assigned to your account", 403)
    return jsonify({"success": True, "students": fetch_all(sql, params)})


@teacher_bp.get("/subjects/<int:subject_id>/attendance")
@require_roles("teacher")
def get_subject_attendance(subject_id):
    user = current_user()
    day = request.args.get("date", "")
    if not user_is_assigned(user["id"], subject_id):
        return error("Subject is not assigned to your account", 403)
    try:
        date.fromisoformat(day)
    except ValueError:
        return error("A valid attendance date is required")
    sql, params = cohort_sql(subject_id, user["id"])
    roster = fetch_all(sql, params)
    marks = fetch_all("SELECT student_id,status FROM attendance WHERE subject_id=%s AND attendance_date=%s", (subject_id, day))
    return jsonify({"success": True, "date": day, "students": roster, "attendance": {str(row["student_id"]): row["status"] for row in marks}})


@teacher_bp.post("/attendance")
@require_roles("teacher")
def save_subject_attendance():
    user = current_user()
    data = request.get_json(silent=True) or {}
    try:
        subject_id = int(data.get("subject_id"))
        day = date.fromisoformat(str(data.get("date", "")))
    except (TypeError, ValueError):
        return error("A valid subject and attendance date are required")
    records = data.get("attendance")
    if not isinstance(records, list) or not records:
        return error("At least one attendance record is required")
    if not user_is_assigned(user["id"], subject_id):
        return error("Subject is not assigned to your account", 403)
    sql, params = cohort_sql(subject_id, user["id"])
    allowed = {row["id"] for row in fetch_all(sql, params)}
    normalized = []
    for record in records:
        try:
            student_id = int(record.get("student_id"))
        except (TypeError, ValueError):
            return error("An attendance record has an invalid student")
        status = record.get("status")
        if student_id not in allowed:
            return error("Attendance includes a student outside this subject's roster", 403)
        if status not in {"Present", "Absent"}:
            return error("Attendance status must be Present or Absent")
        normalized.append((student_id, subject_id, day.isoformat(), status, user["id"]))
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.executemany("""INSERT INTO attendance (student_id,subject_id,attendance_date,status,marked_by)
            VALUES (%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE status=VALUES(status),marked_by=VALUES(marked_by),updated_at=CURRENT_TIMESTAMP""", normalized)
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return jsonify({"success": True, "saved": len(normalized), "message": "Subject attendance saved"})


@teacher_bp.get("/students")
@require_roles("teacher")
def teacher_search_students():
    user = current_user()
    q = request.args.get("q", "").strip()
    like = f"%{q}%"
    rows = fetch_all("""SELECT DISTINCT s.id,s.name,s.sat_id,s.roll_no,s.branch,s.semester,s.batch
        FROM students s JOIN subjects sub ON sub.branch COLLATE utf8mb4_unicode_ci=s.branch COLLATE utf8mb4_unicode_ci
          AND sub.semester COLLATE utf8mb4_unicode_ci=s.semester COLLATE utf8mb4_unicode_ci
          AND sub.batch COLLATE utf8mb4_unicode_ci=s.batch COLLATE utf8mb4_unicode_ci
        JOIN subject_assignments sa ON sa.subject_id=sub.id AND sa.teacher_id=%s
        WHERE (sub.range_mode='full' OR CAST(SUBSTRING_INDEX(s.roll_no,'-',-1) AS UNSIGNED) BETWEEN sub.roll_start AND sub.roll_end)
          AND (%s='' OR s.name LIKE %s OR s.sat_id LIKE %s OR s.roll_no LIKE %s)
        ORDER BY s.roll_no,s.name LIMIT 100""", (user["id"], q, like, like, like))
    return jsonify({"success": True, "students": rows})


@teacher_bp.get("/students/<int:student_id>/attendance")
@require_roles("teacher")
def teacher_student_history(student_id):
    user = current_user()
    eligible = fetch_one("""SELECT s.id FROM students s
        JOIN subjects sub ON sub.branch COLLATE utf8mb4_unicode_ci=s.branch COLLATE utf8mb4_unicode_ci
          AND sub.semester COLLATE utf8mb4_unicode_ci=s.semester COLLATE utf8mb4_unicode_ci
          AND sub.batch COLLATE utf8mb4_unicode_ci=s.batch COLLATE utf8mb4_unicode_ci
        JOIN subject_assignments sa ON sa.subject_id=sub.id AND sa.teacher_id=%s
        WHERE s.id=%s AND (sub.range_mode='full' OR
          CAST(SUBSTRING_INDEX(s.roll_no,'-',-1) AS UNSIGNED) BETWEEN sub.roll_start AND sub.roll_end)
        LIMIT 1""", (user["id"], student_id))
    if not eligible:
        return error("Student is outside your assigned subject cohorts", 403)
    rows = fetch_all("""SELECT a.attendance_date,a.status,su.id AS subject_id,su.name AS subject_name
        FROM attendance a JOIN subjects su ON su.id=a.subject_id
        JOIN subject_assignments sa ON sa.subject_id=su.id AND sa.teacher_id=%s
        WHERE a.student_id=%s ORDER BY a.attendance_date DESC""", (user["id"], student_id))
    student = fetch_one("SELECT id,name,sat_id,roll_no,branch,semester,batch FROM students WHERE id=%s", (student_id,))
    if not student:
        return error("Student not found", 404)
    return jsonify({"success": True, "student": student, "records": rows})


@teacher_bp.get("/reports")
@require_roles("teacher")
def teacher_report():
    user = current_user()
    try:
        subject_id = int(request.args.get("subject_id", ""))
        start = date.fromisoformat(request.args.get("from", ""))
        end = date.fromisoformat(request.args.get("to", ""))
    except (TypeError, ValueError):
        return error("Choose a subject and valid start and end dates")
    if end < start:
        return error("Start date cannot be after end date")
    if not user_is_assigned(user["id"], subject_id):
        return error("Subject is not assigned to your account", 403)
    subject = fetch_one("SELECT id,name,branch,semester,batch FROM subjects WHERE id=%s", (subject_id,))
    sql, params = cohort_sql(subject_id, user["id"])
    students = fetch_all(sql, params)
    marks = fetch_all("SELECT student_id,attendance_date,status FROM attendance WHERE subject_id=%s AND attendance_date BETWEEN %s AND %s", (subject_id,start.isoformat(),end.isoformat()))
    dates = sorted({row["attendance_date"].isoformat() for row in marks})
    index = {row["id"]: row for row in students}
    for row in students:
        row["attendance"] = {}
    for mark in marks:
        if mark["student_id"] in index:
            index[mark["student_id"]]["attendance"][mark["attendance_date"].isoformat()] = mark["status"]
    return jsonify({"success": True, "subject": subject, "from": start.isoformat(), "to": end.isoformat(), "dates": dates, "students": students})


@teacher_bp.get("/schedule")
@require_roles("teacher")
def get_schedule():
    user = current_user()
    rows = fetch_all("""SELECT id,subject_id,custom_title,day_of_week,
        TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time
        FROM teacher_schedule WHERE teacher_id=%s ORDER BY day_of_week,start_time""", (user["id"],))
    return jsonify({"success": True, "schedule": rows})


@teacher_bp.put("/schedule")
@require_roles("teacher")
def save_schedule():
    user = current_user()
    items = (request.get_json(silent=True) or {}).get("schedule")
    if not isinstance(items, list):
        return error("Schedule must be a list")
    normalized = []
    for item in items:
        try:
            day = int(item.get("day_of_week"))
            start = datetime.strptime(str(item.get("start_time", "")), "%H:%M").time()
            end = datetime.strptime(str(item.get("end_time", "")), "%H:%M").time()
        except (TypeError, ValueError):
            return error("Each schedule block needs a day and valid start and end times")
        if day not in range(1, 8) or end <= start:
            return error("Schedule day or time range is invalid")
        subject_id = item.get("subject_id")
        title = str(item.get("custom_title", "")).strip()
        if subject_id:
            try:
                subject_id = int(subject_id)
            except (TypeError, ValueError):
                return error("Invalid subject in schedule")
            if not user_is_assigned(user["id"], subject_id):
                return error("Schedule can use only your assigned subjects", 403)
        elif not title:
            return error("Choose an assigned subject or enter a custom schedule label")
        normalized.append((subject_id, title or None, day, start.strftime("%H:%M:%S"), end.strftime("%H:%M:%S")))
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM teacher_schedule WHERE teacher_id=%s", (user["id"],))
        cur.executemany("INSERT INTO teacher_schedule (teacher_id,subject_id,custom_title,day_of_week,start_time,end_time) VALUES (%s,%s,%s,%s,%s,%s)",
                        [(user["id"], *item) for item in normalized])
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return jsonify({"success": True, "message": "Schedule saved", "count": len(normalized)})
