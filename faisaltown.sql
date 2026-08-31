CREATE DATABASE faisal_town_inventory;

USE faisal_town_inventory;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

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

ALTER TABLE users
ADD COLUMN role ENUM(
    'admin',
    'manager',
    'engineer',
    'viewer'
) NOT NULL DEFAULT 'viewer'
AFTER password;
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

    remarks TEXT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
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
SELECT id, username, email, role FROM users;
INSERT INTO users (username, email, password, role)
VALUES (
    'admin',
    'admin@construction.com',
    'admin123',
    'admin'
);
UPDATE users
SET password = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE username = 'admin';
DELETE FROM users WHERE username = 'admin';