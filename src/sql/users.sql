CREATE DATABASE ecosystem;

USE ecosystem;

CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       email_or_phone VARCHAR(255) NOT NULL,
                       password VARCHAR(255) NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

-- CREATE TABLE users (
--                        user_id INT AUTO_INCREMENT PRIMARY KEY,
--                        name VARCHAR() NOT NULL,
--                        email VARCHAR(255) NOT NULL,
--                        phone INT NOT NULL,
--                        hashed_password VARCHAR(255) NOT NULL,
--                        role_id FOREIGN KEY NOT NULL,
-- )

CREATE TABLE role (

)


CREATE TABLE devices (
                       device_id int AUTO_INCREMENT PRIMARY KEY,
                       

);