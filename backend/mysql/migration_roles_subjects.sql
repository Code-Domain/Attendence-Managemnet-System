-- Additive migration for role-based access, subject assignments and teacher schedules.
-- Apply once to the existing student_attendance database after selecting it in MySQL Workbench.

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    teacher_id VARCHAR(50) NULL UNIQUE,
    phone VARCHAR(30) NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','teacher') NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    semester VARCHAR(30) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    batch VARCHAR(30) NOT NULL,
    range_mode ENUM('full','custom') NOT NULL DEFAULT 'full',
    roll_start SMALLINT UNSIGNED NULL,
    roll_end SMALLINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_subject_cohort (name, branch, semester, batch),
    KEY idx_subject_cohort (branch, semester, batch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subject_assignments (
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (subject_id, teacher_id),
    CONSTRAINT fk_assignment_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    subject_id INT NULL,
    custom_title VARCHAR(150) NULL,
    day_of_week TINYINT UNSIGNED NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedule_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    KEY idx_schedule_teacher_day (teacher_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE students
    ADD COLUMN batch VARCHAR(30) NOT NULL DEFAULT '';

ALTER TABLE attendance
    ADD COLUMN subject_id INT NULL,
    ADD COLUMN marked_by INT NULL,
    DROP INDEX uq_student_date,
    ADD UNIQUE KEY uq_student_subject_date (student_id, subject_id, attendance_date),
    ADD KEY idx_attendance_subject_date (subject_id, attendance_date),
    ADD CONSTRAINT fk_attendance_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_attendance_marker FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL;
