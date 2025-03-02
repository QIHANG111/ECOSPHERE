CREATE DATABASE ecosystem;

USE ecosystem;



CREATE TABLE Users (
                    user_id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    phone VARCHAR(15) NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    role_id INT NOT NULL,
                    FOREIGN KEY (role_id) REFERENCES Role(role_id)
);


CREATE TABLE Devices (
                    device_id INT AUTO_INCREMENT PRIMARY KEY,
                    device_name VARCHAR(255) NOT NULL,
                    device_type VARCHAR(255) NOT NULL,
                    status VARCHAR(63) NOT NULL
);

CREATE TABLE Energy(
                    usage_id INT AUTO_INCREMENT NOT NULL,
                    device_id INT NOT NULL,
                    PRIMARY KEY (usage_id, device_id),
                    FOREIGN KEY (device_id) REFERENCES Devices(device_id),
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
                    description VARCHAR(255)
);

CREATE TABLE RolePermission(
                    role_id INT NOT NULL,
                    permission_id INT NOT NULL,
                    PRIMARY KEY (role_id, permission_id),
                    FOREIGN KEY (role_id) REFERENCES Role(role_id),
                    FOREIGN KEY (permission_id) REFERENCES Permission(permission_id)
);

INSERT INTO Permission (category, name, description) VALUES 
('user_management', 'create_user', 'Create new user accounts'),
('user_management', 'delete_user', 'Delete user accounts'),
('user_management', 'update_user', 'Update user accounts'),
('user_management', 'view_user', 'View user accounts'),
('user_management', 'assign_user', 'Assign role to user accounts'),
('device_control', 'add_device', 'Add a device to the system'),
('device_control', 'delete_device', 'Remove a device from the system'),
('device_control', 'modify_device', 'Modify connected device setting'),
('device_control', 'view_device', 'View connected device'),
('device_control', 'control_device', 'Turn devices ON/OFF remotely'),
('device_control', 'schedule_device', 'Set automation schedule'),
('energy_monitoring', 'view_energy', 'View energy consumption reports'),
('energy_monitoring', 'compare_energy', 'Compare energy usage trends'),
('energy_monitoring', 'rec_energy', 'Receive energy-saving recommendations'),
('energy_monitoring', 'alert_energy', 'Get alerts for high energy usage'),
('system', 'system_backup', 'Perform system backup'),
('system', 'system_restore', 'Restore system from backup'),
('system', 'system_updates', 'Perform system updates');
