CREATE DATABASE ecosystem;

USE ecosystem;

CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       email_or_phone VARCHAR(255) NOT NULL,
                       password VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);