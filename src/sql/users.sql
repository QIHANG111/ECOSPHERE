CREATE DATABASE ecosystem;

USE ecosystem;

CREATE TABLE Users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Devices (
                    device_id INT AUTO_INCREMENT PRIMARY KEY,
                    device_name VARCHAR(255) NOT NULL,
                    device_type VARCHAR(255) NOT NULL,
                    Status VARCHAR(63) NOT NULL
);

CREATE TABLE Energy(
                    usage_id INT AUTO_INCREMENT NOT NULL,
                    device_id INT NOT NULL,
                    PRIMARY KEY (usage_id, device_id),
                    FOREIGN KEY (device_id) REFERENCES devices(device_id),
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    energy_consumed DOUBLE(255, 2)
);

CREATE TABLE Role(
                    role_id INT AUTO_INCREMENT PRIMARY KEY,
                    role_name VARCHAR(255) NOT NULL
);

CREATE TABLE Permission(
                    permission_id INT AUTO_INCREMENT PRIMARY KEY,
                    category VARCHAR(255),
                    name VARCHAR(255) NOT NULL,
                    description VARCHAR(255),
);

CREATE TABLE RolePermission(
                    role_id INT NOT NULL
                    permission_id INT NOT NULL
                    PRIMARY KEY (role_id, permission_id),
                    FOREIGN KEY (role_id) REFERENCES Role(role_id)
                    FOREIGN KEY (permission_id) REFERENCES Permission(permission_id)
);