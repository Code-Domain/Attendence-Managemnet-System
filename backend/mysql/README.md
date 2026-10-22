# Student Attendance Reporting System

The application has a public organization site, a separate administrator sign-in and a separate teacher sign-in. Flask serves the API and MySQL stores students, staff accounts, subjects, assignments, schedules and attendance.

## Existing database setup

The configured Aiven `student_attendance` database has already had the portal migrations applied, including username sign-in and first-login password rotation. Do not rerun them on that database. For a different existing database, run `migration_roles_subjects.sql`, `migration_site_settings.sql`, and `migration_usernames.sql` **once each, in that order**, in MySQL Workbench while connected to that database. These migrations add the portal tables, student batches, subject-specific attendance fields and website settings without deleting existing records.

For a brand-new database, run `schema.sql` once instead; it already includes the current username and security columns. Do not rerun the existing-database migration after it has succeeded; the attendance unique index is replaced as part of that migration.

## Local development

1. In this folder, copy `.env.example` to `.env` and set your MySQL host, port, username, password, database, and a long random `SECRET_KEY`. Keep `.env` private.
2. Create and activate the Python environment, then install dependencies:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. After the database migration has completed, create the first administrator from this folder:

   ```powershell
   py -m flask --app app create-admin
   ```

   The command prompts for the admin's name, email and password. Passwords are stored as hashes.

4. Start the Flask API:

   ```powershell
   py app.py
   ```

5. In another terminal, serve `Ravi/frontend`:

   ```powershell
   cd ..\..\frontend
   py -m http.server 5501
   ```

6. Open `http://127.0.0.1:5501`. Sign in at `admin-login.html` or `teacher-login.html`.

## Administrator workflow

- Add students with registration number, class roll number, branch, semester and batch.
- Create subjects for a cohort, choose the full cohort or an inclusive numeric roll suffix range, and assign teachers.
- Create teacher accounts, pause/reactivate access, and reset a teacher password.
- Change the administrator's own password.

## Teacher workflow

- Sign in to see assigned subjects only.
- Drag an assigned subject into the weekly planner; add custom labels for planning-only schedule entries.
- Load an assigned subject's eligible roster, mark present/absent, and save records by subject and date.
- Search eligible students, inspect attendance for assigned subjects and export a subject/date-range CSV matrix.

Only attendance for administrator-assigned subjects can be marked. Subject rosters are filtered by branch, semester, batch and the configured roll range.

## Deployment notes

Before public deployment, set a production `SECRET_KEY`, configure `SESSION_COOKIE_SAMESITE=None` and `SESSION_COOKIE_SECURE=true` for cross-site HTTPS hosting, and set `FRONTEND_ORIGINS` to the exact deployed frontend origin(s). Keep the Aiven CA verification configuration and all secrets private. Run Flask with a production WSGI server rather than the development server.
