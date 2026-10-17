-- Run once after migration_roles_subjects.sql to enable public-site branding controls.
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(60) PRIMARY KEY,
    setting_value VARCHAR(500) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
