-- Run once after the portal migrations to enable username sign-in and one-time password rotation.
ALTER TABLE users
    ADD COLUMN username VARCHAR(80) NULL UNIQUE AFTER name,
    ADD COLUMN password_change_required BOOLEAN NOT NULL DEFAULT FALSE AFTER password_hash,
    MODIFY COLUMN email VARCHAR(254) NULL;

UPDATE users SET username=teacher_id WHERE role='teacher' AND username IS NULL;
