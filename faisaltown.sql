CREATE DATABASE faisal_town_inventory;

USE faisal_town_inventory;


-- ================= USERS =================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,

    username VARCHAR(100) NOT NULL UNIQUE,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    role ENUM(
        'admin',
        'manager',
        'engineer',
        'viewer'
    ) NOT NULL DEFAULT 'viewer',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ================= PROJECTS =================

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    code VARCHAR(100),

    location VARCHAR(255),

    description TEXT,

    start_date DATE,

    status VARCHAR(50) DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ================= INVENTORY =================

CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,

    project VARCHAR(150) NOT NULL,

    item VARCHAR(255) NOT NULL,

    grade VARCHAR(100),

    po_reference VARCHAR(100),

    unit VARCHAR(50),

    rate DECIMAL(12,2) DEFAULT 0.00,

    demand DECIMAL(12,2) DEFAULT 0.00,

    received DECIMAL(12,2) DEFAULT 0.00,

    checked_out DECIMAL(12,2) DEFAULT 0.00,

    remarks TEXT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);


-- ================= CHECKOUTS =================

CREATE TABLE checkouts (
    id INT AUTO_INCREMENT PRIMARY KEY,

    inventory_id INT NOT NULL,

    quantity DECIMAL(15,2) NOT NULL,

    checked_out_to VARCHAR(255) NOT NULL,

    checked_out_by INT NOT NULL,

    purpose TEXT,

    checkout_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (inventory_id)
        REFERENCES inventory(id),

    FOREIGN KEY (checked_out_by)
        REFERENCES users(id)
);

CREATE TABLE inventory_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,

    inventory_id INT NOT NULL,

    file_name VARCHAR(255) NOT NULL,

    file_path VARCHAR(500) NOT NULL,

    uploaded_by INT NOT NULL,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (inventory_id)
        REFERENCES inventory(id)
        ON DELETE CASCADE,

    FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
);
-- ================= CHECK TABLES =================

SELECT * FROM users;

SELECT * FROM projects;

SELECT * FROM inventory;

SELECT * FROM checkouts;

DESCRIBE inventory;



SELECT id, username, email, role
FROM users;

INSERT INTO users (username, email, password, role)
VALUES
(
    'admin',
    'admin@construction.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin'
),
(
    'manager',
    'manager@construction.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'manager'
),
(
    'engineer',
    'engineer@construction.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'engineer'
),
(
    'viewer',
    'viewer@construction.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'viewer'
);

UPDATE users

SET password = '$2b$10$669ExSHHP4eVddhDivUbiOMO2UsXZHpk3a3iKB4901249ATQVUm2K'

WHERE username IN ('admin');

UPDATE users

SET password = '$2b$10$kmvoICXS7Apox8YGGvOfZev4ffrKtWTCMytbEO8Aj1oxzXBTBhWju'

WHERE username IN ('manager');

UPDATE users

SET password = '$2b$10$WTdacQuLM02KXNGCPHeB4uwvVvvoUSsEarlN8AlwgyWkxjSvsb/uS'

WHERE username IN ('engineer');

UPDATE users

SET password = '$2b$10$3Lz.qQ0LfeJw1W0o5ZJf9u/FtUKxVIg8ngJK/0egH9KuBtz0xoTSa'

WHERE username IN ('viewer');

USE faisal_town_inventory;

SELECT * FROM inventory;

USE faisal_town_inventory;

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    inventory_id INT NULL,

    action VARCHAR(50) NOT NULL,

    entity_type VARCHAR(50) NOT NULL DEFAULT 'inventory',

    entity_name VARCHAR(255),

    changes JSON,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id),

    INDEX idx_audit_inventory (inventory_id),

    INDEX idx_audit_user (user_id),

    INDEX idx_audit_created (created_at)
);

USE faisal_town_inventory;

ALTER TABLE users
ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1;