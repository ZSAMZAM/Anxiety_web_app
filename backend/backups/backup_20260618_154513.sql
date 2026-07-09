-- AnxietyCare database backup
-- Created at 2026-06-18 15:45:13 UTC
SET FOREIGN_KEY_CHECKS=0;

CREATE DATABASE IF NOT EXISTS `anxiety_prediction(web+app))`;
USE `anxiety_prediction(web+app))`;

DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `permissions` varchar(255) DEFAULT 'all',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `admins_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `admins` (`id`, `user_id`, `permissions`, `created_at`) VALUES (1, 1, 'all', '2026-05-13 05:57:57');

DROP TABLE IF EXISTS `appointments`;
CREATE TABLE `appointments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `doctor_name` varchar(255) DEFAULT NULL,
  `appointment_date` date DEFAULT NULL,
  `appointment_time` time DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `doctor_id` int(11) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (1, 4, 'zamzam', '2026-05-20', '13:44:00', 'niyad jab aa dremaa', 'Completed', '2026-05-19 00:44:59', NULL, NULL);
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (2, 4, 'zamzam', '2026-05-26', '4:59:00', 'niyad jab', 'Pending', '2026-05-19 00:56:21', NULL, NULL);
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (3, 4, 'zamzam', '2026-05-26', '2:17:00', 'wani niyad jabsanahay', 'Cancelled', '2026-05-19 11:15:33', 5, '0613456789');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (4, 2, 'shacbaan ali', '2026-05-27', '11:49:00', 'cabsi', 'Accepted', '2026-05-20 10:49:38', 6, '0613456785');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (6, 4, 'shacbaan ali', '2026-05-15', '6:23:00', '', 'Rejected', '2026-05-23 05:24:25', 6, '0612356786');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (7, 4, 'shacbaan ali', '2026-05-10', '15:23:00', '', 'Pending', '2026-05-24 01:24:05', 6, '84764543425');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (8, 4, 'shacbaan ali', '2026-05-26', '1:34:00', '', 'Pending', '2026-05-25 00:34:55', 6, '037364554');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (9, 3, 'shacbaan ali', '2026-06-03', '5:16:00', '', 'Pending', '2026-06-01 04:16:28', 6, '9765445');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (10, 10, 'qalaf', '2026-06-01', '8:10:00', 'walwal', 'Pending', '2026-06-01 08:11:07', 9, '0612567845');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (11, 2, 'qalaf', '2026-06-22', '9:00:00', '', 'Pending Payment', '2026-06-16 07:11:21', 8, '+252614197803');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (12, 2, 'qalaf', '2026-06-22', '10:00:00', '', 'Pending Payment', '2026-06-16 07:21:08', 8, '+252617088203');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (13, 2, 'qalaf', '2026-06-22', '11:00:00', '', 'Pending Payment', '2026-06-16 22:43:38', 8, '+252617574015');
INSERT INTO `appointments` (`id`, `user_id`, `doctor_name`, `appointment_date`, `appointment_time`, `notes`, `status`, `created_at`, `doctor_id`, `phone`) VALUES (14, 2, 'qalaf', '2026-06-22', '12:00:00', 'i need the doctor urgently', 'Confirmed', '2026-06-18 05:52:19', 8, '+252614197803');

DROP TABLE IF EXISTS `appointment_ratings`;
CREATE TABLE `appointment_ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_appointment_rating` (`appointment_id`),
  KEY `user_id` (`user_id`),
  KEY `doctor_id` (`doctor_id`),
  CONSTRAINT `appointment_ratings_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`),
  CONSTRAINT `appointment_ratings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `appointment_ratings_ibfk_3` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (1, 'superadmin', 'SUPER_ADMIN', 'LOGIN', 'Super Admin logged in', '127.0.0.1', '2026-06-09 08:28:08');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (2, 'superadmin', 'SUPER_ADMIN', 'UPDATE_ROLE', 'Updated role 1 permissions', '127.0.0.1', '2026-06-09 08:29:50');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (3, 'superadmin', 'SUPER_ADMIN', 'CREATE_BACKUP', 'Created backup: backup_20260609_083009.sql', '127.0.0.1', '2026-06-09 08:30:09');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (4, 'superadmin', 'SUPER_ADMIN', 'UPDATE_SETTINGS', 'Updated system settings', '127.0.0.1', '2026-06-09 08:31:15');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (5, 'superadmin', 'SUPER_ADMIN', 'LOGOUT', 'Super Admin logged out', '127.0.0.1', '2026-06-09 17:52:51');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (6, 'superadmin', 'SUPER_ADMIN', 'LOGIN', 'Super Admin logged in', '127.0.0.1', '2026-06-18 06:42:43');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (7, 'superadmin', 'SUPER_ADMIN', 'SEND_NOTIFICATION', 'Sent notification to all', '127.0.0.1', '2026-06-18 06:55:42');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (8, 'superadmin', 'SUPER_ADMIN', 'LOGOUT', 'Super Admin logged out', '127.0.0.1', '2026-06-18 06:55:48');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (9, 'superadmin', 'SUPER_ADMIN', 'LOGIN', 'Super Admin logged in', '127.0.0.1', '2026-06-18 06:56:11');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (10, 'superadmin', 'SUPER_ADMIN', 'LOGOUT', 'IT administrator logged out', '127.0.0.1', '2026-06-18 13:47:11');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (11, 'superadmin', 'SUPER_ADMIN', 'LOGIN', 'IT administrator logged in', '127.0.0.1', '2026-06-18 13:48:04');
INSERT INTO `audit_logs` (`id`, `actor`, `role`, `action`, `description`, `ip_address`, `created_at`) VALUES (12, 'superadmin', 'SUPER_ADMIN', 'CREATE_BACKUP', 'Created backup: backup_20260618_143602.sql', '127.0.0.1', '2026-06-18 14:36:02');

DROP TABLE IF EXISTS `backups`;
CREATE TABLE `backups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `backup_name` varchar(255) NOT NULL,
  `backup_size` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `backup_path` varchar(500) DEFAULT NULL,
  `database_names` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `backups` (`id`, `backup_name`, `backup_size`, `created_at`, `backup_path`, `database_names`) VALUES (1, 'backup_20260609_083009.sql', '0', '2026-06-09 08:30:09', NULL, NULL);
INSERT INTO `backups` (`id`, `backup_name`, `backup_size`, `created_at`, `backup_path`, `database_names`) VALUES (2, 'backup_20260618_143602.sql', '0', '2026-06-18 14:36:02', NULL, NULL);

DROP TABLE IF EXISTS `doctors`;
CREATE TABLE `doctors` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `specialization` varchar(255) DEFAULT NULL,
  `hospital_name` varchar(255) DEFAULT NULL,
  `experience` varchar(100) DEFAULT NULL,
  `phone` varchar(10) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `rating` decimal(3,1) DEFAULT 0.0,
  `status` varchar(50) NOT NULL DEFAULT 'Active',
  `photo` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `consultation_fee` decimal(10,2) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `specialty` varchar(255) DEFAULT NULL,
  `clinic_name` varchar(255) DEFAULT NULL,
  `experience_years` int(11) DEFAULT NULL,
  `license_number` varchar(100) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `clinic_address` text DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `availability_schedule` text DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `address` text DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `doctors` (`id`, `name`, `specialization`, `hospital_name`, `experience`, `phone`, `email`, `rating`, `status`, `photo`, `created_at`, `consultation_fee`, `user_id`, `specialty`, `clinic_name`, `experience_years`, `license_number`, `bio`, `clinic_address`, `district`, `city`, `availability_schedule`, `fullname`, `username`, `avatar`, `address`) VALUES (6, 'shacbaan ali', 'mental helth', 'Digfeer Hospital', '3', '0613456780', NULL, 0.9, 'ACTIVE', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAANQAAADuCAMAAAB24dnhAAAB9VBMVEX////1g0X+z4z3rK3//NYAAADuHCT3hEX6hUX/jEn//9v/ikj/iEf//9z8h0f/1I/5+fn//+H/j0v09PT/hkT/2JH//+X+s7Tv7+/+zozn5+fg4OD/uLnV1dVhYWH/srTpgEfefEbKysosLCycnp/xhUj//+mOkZKkpqeeXDdKSkrZ2dk9PT2EhofRdEHFxcWwsbFRVVesYTd2RSnVdT+UUSq5aj52dnZra2uSVjW3uboeAACzYjTrqKm6uaHIeUzsx4k/KiAWFhY7RUknIR1nPihIKRZUNSQTAACsbEgADhDEbz9YMx0uOz+CRiJLMiSOZ2afn43NzLXOlpZ0dGaKiXno6cr/HiblczXQr3z/45jMuJnYuYHryotEOSwWHyMrDQBmNxhIIgY5IhZkMQ+JSSNwSTM1FgBhWFQxBA', '2026-05-20 02:37:03', 0.01, 6, NULL, 'Psychology Clinic', 3, NULL, 'Mental health therapist helping patients with anxiety and emotional wellbeing.', 'Mogadishu', 'Hodan', 'Mogadishu', NULL, NULL, NULL, NULL, NULL);
INSERT INTO `doctors` (`id`, `name`, `specialization`, `hospital_name`, `experience`, `phone`, `email`, `rating`, `status`, `photo`, `created_at`, `consultation_fee`, `user_id`, `specialty`, `clinic_name`, `experience_years`, `license_number`, `bio`, `clinic_address`, `district`, `city`, `availability_schedule`, `fullname`, `username`, `avatar`, `address`) VALUES (8, 'qalaf', 'therapy', 'Banadir Hospital', '5', '9765445', NULL, 4.7, 'ACTIVE', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMSEhUTExMWFhUXGBUWFxgXFxcdGhgYGBcWGBoYFhcYHSggGBolHRcYITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHiYtLS0tLS0vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKy0tLf/AABEIAO0A1QMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAADAQIEBQYABwj/xAA+EAABAwIEAwYDBQgBBAMAAAABAAIRAyEEEjFBBVFhBhMiMnGBFJGhB0KxwfAVI2JygtHh8UNSg5KyM1Nj/8QAGgEBAAMBAQEAAAAAAAAAAAAAAAECAwQFBv/EACURAQACAgICAgICAwAAAAAAAAABAgMRITEEEhNBBVEUsRVxof/aAAwDAQACEQMRAD8A9xUF+p9Suznmf', '2026-06-01 07:50:47', 0.01, 9, NULL, 'Mental Health Center', 5, NULL, 'Licensed therapist specializing in anxiety, depression, stress management and counseling.', 'Mogadishu', 'Hodan', 'Mogadishu', '{"monday":{"available":true,"slots":[{"start":"09:00","end":"17:00"}]},"saturday":{"available":true,"slots":[{"start":"07:00","end":"18:00"}]}}', NULL, NULL, NULL, NULL);

DROP TABLE IF EXISTS `doctors_backup`;
CREATE TABLE `doctors_backup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(150) NOT NULL,
  `specialty` varchar(100) NOT NULL,
  `hospital_name` varchar(150) NOT NULL,
  `experience` int(11) DEFAULT 0,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `image` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `doctor_availability`;
CREATE TABLE `doctor_availability` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` int(11) NOT NULL,
  `day_of_week` varchar(20) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `status` enum('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Unread',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `recipient` varchar(255) DEFAULT NULL,
  `notification_type` varchar(50) DEFAULT 'general',
  `recipient_type` varchar(50) DEFAULT 'all',
  `is_read` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (1, 2, NULL, 'Test notification from debug', 'Unread', '2026-05-20 12:20:01', 'batuulo@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (2, 3, NULL, 'Test notification from debug', 'Unread', '2026-05-20 12:20:01', 'farax@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (3, 4, NULL, 'Test notification from debug', 'Read', '2026-05-20 12:20:01', 'xasan@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (5, 2, NULL, 'balamaha maanta wee baaq deen', 'Unread', '2026-05-21 02:22:24', 'batuulo@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (6, 3, NULL, 'balamaha maanta wee baaq deen', 'Unread', '2026-05-21 02:22:24', 'farax@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (7, 4, NULL, 'balamaha maanta wee baaq deen', 'Read', '2026-05-21 02:22:24', 'xasan@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (10, 2, NULL, 'maalinta isninta mala shaqenayo', 'Unread', '2026-05-23 05:17:58', 'batuulo@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (11, 3, NULL, 'maalinta isninta mala shaqenayo', 'Unread', '2026-05-23 05:17:58', 'farax@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (12, 4, NULL, 'maalinta isninta mala shaqenayo', 'Read', '2026-05-23 05:17:58', 'xasan@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (13, 2, NULL, 'feature update lasameye', 'Unread', '2026-05-24 00:59:53', 'batuulo@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (14, 3, NULL, 'feature update lasameye', 'Unread', '2026-05-24 00:59:53', 'farax@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (15, 1, NULL, 'feature update lasameye', 'Unread', '2026-05-24 00:59:53', 'Group40@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (16, 6, NULL, 'feature update lasameye', 'Unread', '2026-05-24 00:59:53', 'shacbaan@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (17, 4, NULL, 'feature update lasameye', 'Read', '2026-05-24 00:59:53', 'xasan@gmail.com', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (18, 2, NULL, 'appointment maan waa la cancel', 'Read', '2026-05-24 01:16:01', 'batuulo@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (19, 3, NULL, 'appointment maan waa la cancel', 'Unread', '2026-05-24 01:16:01', 'farax@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (20, 1, NULL, 'appointment maan waa la cancel', 'Unread', '2026-05-24 01:16:01', 'Group40@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (21, 6, NULL, 'appointment maan waa la cancel', 'Unread', '2026-05-24 01:16:01', 'shacbaan@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (22, 4, NULL, 'appointment maan waa la cancel', 'Read', '2026-05-24 01:16:01', 'xasan@gmail.com', 'alert', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (23, 2, 'Appointment created', 'Your appointment is pending payment.', 'Unread', '2026-06-16 07:11:21', NULL, 'appointment_created', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (24, 2, 'Payment failed', 'Your payment could not be completed. Please try again.', 'Unread', '2026-06-16 07:15:24', NULL, 'payment_failed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (25, 2, 'Appointment created', 'Your appointment is pending payment.', 'Unread', '2026-06-16 07:21:08', NULL, 'appointment_created', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (26, 2, 'Payment failed', 'Your payment could not be completed. Please try again.', 'Unread', '2026-06-16 07:23:26', NULL, 'payment_failed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (27, 2, 'Payment failed', 'Your payment could not be completed. Please try again.', 'Unread', '2026-06-16 07:26:17', NULL, 'payment_failed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (28, 2, 'Payment failed', 'Your payment could not be completed. Please try again.', 'Unread', '2026-06-16 07:26:57', NULL, 'payment_failed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (29, 2, 'Payment failed', 'Your payment could not be completed. Please try again.', 'Unread', '2026-06-16 07:30:57', NULL, 'payment_failed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (30, 2, 'Payment failed', 'Your payment could not be completed. Please try again.', 'Unread', '2026-06-16 07:33:27', NULL, 'payment_failed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (31, 2, 'Appointment created', 'Your appointment is pending payment.', 'Unread', '2026-06-16 22:43:38', NULL, 'appointment_created', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (32, 2, 'Payment failed', 'Your payment could not be completed. Please try again.', 'Unread', '2026-06-16 22:44:28', NULL, 'payment_failed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (33, NULL, 'waa la xaliyey systemka', 'waxaan idin la socodsiineyaa in systemka la xaliyey', 'Unread', '2026-06-18 06:55:42', 'all', 'general', 'all', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (34, 2, 'Appointment created', 'Your appointment is pending payment.', 'Unread', '2026-06-18 05:52:19', NULL, 'appointment_created', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (35, 9, 'Appointment confirmed', 'A patient payment was completed and the appointment is confirmed.', 'Unread', '2026-06-18 05:52:57', NULL, 'appointment_confirmed', 'user', 0);
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `status`, `created_at`, `recipient`, `notification_type`, `recipient_type`, `is_read`) VALUES (36, 2, 'Payment successful', 'Your payment was successful and your appointment is confirmed.', 'Unread', '2026-06-18 05:52:57', NULL, 'payment_confirmation', 'user', 0);

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_status` varchar(50) DEFAULT 'Completed',
  `transaction_id` varchar(100) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reference_id` varchar(100) DEFAULT NULL,
  `invoice_id` varchar(100) DEFAULT NULL,
  `payment_phone` varchar(20) DEFAULT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `merchant_response` text DEFAULT NULL,
  `provider_name` varchar(50) DEFAULT NULL,
  `provider_transaction_id` varchar(255) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `service_status` varchar(50) DEFAULT 'Waiting',
  `service_verified_by` int(11) DEFAULT NULL,
  `service_verified_at` datetime DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `patient_response` text DEFAULT NULL,
  `refund_reason` text DEFAULT NULL,
  `refund_notes` text DEFAULT NULL,
  `refunded_by` int(11) DEFAULT NULL,
  `refunded_at` datetime DEFAULT NULL,
  `service_verified` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (1, 2, 128.00, 'wafi', 'Completed', 'WAFI-1779021778361', 'Therapy session payment for zamzam', '2026-05-17 05:42:58', NULL, NULL, NULL, 'USD', NULL, NULL, NULL, NULL, 4, 6, NULL, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (2, 4, 20.00, 'wafi', 'Completed', 'BOOKING-3-WAFI-1779214591285', 'Doctor appointment with zamzam on 2026-05-26', '2026-05-19 11:16:31', NULL, NULL, NULL, 'USD', NULL, NULL, NULL, NULL, 1, NULL, NULL, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (3, 2, 24.50, 'evc_plus', 'Completed', 'BOOKING-4-EVC_PLUS-1779299425487', 'Doctor appointment with shacbaan ali on 2026-05-27', '2026-05-20 10:50:25', NULL, NULL, NULL, 'USD', NULL, NULL, NULL, NULL, 4, 6, NULL, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (4, 4, 24.50, 'evc_plus', 'Completed', 'BOOKING-6-EVC_PLUS-1779539124893', 'Doctor appointment with shacbaan ali on 2026-05-15', '2026-05-23 05:25:25', NULL, NULL, NULL, 'USD', NULL, NULL, NULL, NULL, 1, NULL, NULL, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (5, 3, 5.00, 'evc_plus', 'Completed', 'TXN-441153', 'Doctor appointment with shacbaan ali on 2026-06-03', '2026-06-01 04:16:44', NULL, NULL, NULL, 'USD', NULL, NULL, NULL, NULL, 9, 6, NULL, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (6, 10, 5.00, 'wafi', 'Completed', 'TXN-966497', 'Doctor appointment with qalaf on 2026-06-01', '2026-06-01 08:11:47', NULL, NULL, NULL, 'USD', NULL, NULL, NULL, NULL, 10, 9, NULL, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (7, 2, 0.01, 'mwallet_account', 'Pending', 'TXN-1781644309-8314', 'Appointment payment', '2026-06-16 07:12:07', 'TXN-1781644309-8314', 'INV-1781644309-4926', '+252614197803', 'USD', NULL, NULL, NULL, NULL, 11, 8, 11, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (8, 2, 0.01, 'mwallet_account', 'Failed', 'TXN-1781644493-4617', 'Appointment payment', '2026-06-16 07:15:24', 'TXN-1781644493-4617', NULL, '+252612289239', 'USD', NULL, NULL, NULL, NULL, 11, 8, 11, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (9, 2, 0.01, 'mwallet_account', 'Pending', 'TXN-1781644900-4238', 'Appointment payment', '2026-06-16 07:22:05', 'TXN-1781644900-4238', 'INV-1781644900-3078', '+252617088203', 'USD', NULL, NULL, NULL, NULL, 12, 8, 12, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (10, 2, 0.01, 'mwallet_account', 'Failed', 'TXN-1781644975-2249', 'Appointment payment', '2026-06-16 07:23:26', 'TXN-1781644975-2249', NULL, '+252618273217', 'USD', NULL, NULL, NULL, NULL, 12, 8, 12, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (11, 2, 0.01, 'mwallet_account', 'Failed', 'TXN-1781645146-8713', 'Appointment payment', '2026-06-16 07:26:17', 'TXN-1781645146-8713', NULL, '+252618273217', 'USD', NULL, NULL, NULL, NULL, 12, 8, 12, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (12, 2, 0.01, 'mwallet_account', 'Failed', 'TXN-1781645187-4153', 'Appointment payment', '2026-06-16 07:26:57', 'TXN-1781645187-4153', NULL, '+252615797905', 'USD', NULL, NULL, NULL, NULL, 12, 8, 12, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (13, 2, 0.01, 'mwallet_account', 'Pending', 'TXN-1781645372-1555', 'Appointment payment', '2026-06-16 07:29:45', 'TXN-1781645372-1555', 'INV-1781645372-8142', '+252613795102', 'USD', NULL, NULL, NULL, NULL, 12, 8, 12, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (14, 2, 0.01, 'mwallet_account', 'Failed', 'TXN-1781645427-2313', 'Appointment payment', '2026-06-16 07:30:57', 'TXN-1781645427-2313', NULL, '+252614868907', 'USD', NULL, NULL, NULL, NULL, 12, 8, 12, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (15, 2, 0.01, 'mwallet_account', 'Failed', 'TXN-1781645576-8842', 'Appointment payment', '2026-06-16 07:33:27', 'TXN-1781645576-8842', NULL, '+252614868907', 'USD', NULL, NULL, NULL, NULL, 12, 8, 12, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (16, 2, 0.01, 'mwallet_account', 'Failed', 'TXN-1781700237-4348', 'Appointment payment', '2026-06-16 22:44:28', 'TXN-1781700237-4348', NULL, '+252617574015', 'USD', NULL, NULL, NULL, NULL, 13, 8, 13, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `payments` (`id`, `user_id`, `amount`, `payment_method`, `payment_status`, `transaction_id`, `description`, `created_at`, `reference_id`, `invoice_id`, `payment_phone`, `currency`, `merchant_response`, `provider_name`, `provider_transaction_id`, `paid_at`, `appointment_id`, `doctor_id`, `booking_id`, `service_status`, `service_verified_by`, `service_verified_at`, `verification_notes`, `patient_response`, `refund_reason`, `refund_notes`, `refunded_by`, `refunded_at`, `service_verified`) VALUES (17, 2, 0.01, 'mwallet_account', 'Completed', 'TXN-1781812358-8070', 'Appointment payment', '2026-06-18 05:52:56', 'TXN-1781812358-8070', 'INV-1781812358-7041', '+252614197803', 'USD', '{"schemaVersion": "1.0", "timestamp": "2026-06-18 15:53:45.704", "responseId": "TXN-1781812358-8070", "responseCode": "2001", "errorCode": "0", "responseMsg": "RCS_SUCCESS", "params": {"orderId": "32493564", "accountNo": "252614****7803", "accountType": "mwallet_account", "state": "APPROVED", "referenceId": "TXN-1781812358-8070", "transactionId": "80335654", "issuerTransactionId": "31731969071", "txAmount": "0.01"}}', 'WaafiPay', '80335654', '2026-06-18 12:52:56', 14, 8, 14, 'Waiting', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

DROP TABLE IF EXISTS `predictions`;
CREATE TABLE `predictions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `input_text` text DEFAULT NULL,
  `cleaned_text` text DEFAULT NULL,
  `prediction_result` varchar(50) DEFAULT NULL,
  `confidence_score` float DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `score` float DEFAULT NULL,
  `anxiety_level` varchar(50) DEFAULT NULL,
  `recommendation` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `predictions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (1, 2, 'maanta waa maalin qurux badan waana faraxsanahay', 'maanta waa maalin qurux badan waana faraxsanahay', 'Neutral', 0.993997, '2026-05-13 06:01:27', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (2, 2, 'waa faraxsanahay', 'waa faraxsanahay', 'Neutral', 0.92776, '2026-05-13 06:34:53', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (3, 2, 'waan daale', 'waan daale', 'Depression', 0.949857, '2026-05-13 06:35:34', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (4, 2, 'aad baan ufaraxsanahay', 'aad baan ufaraxsanahay', 'Depression', 0.884907, '2026-05-13 06:35:59', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (5, 2, 'aad baan ufaraxsanahay', 'aad baan ufaraxsanahay', 'Depression', 0.884907, '2026-05-13 06:36:03', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (6, 2, 'waan kadaale ina udagalamo waxaa heleynin', 'waan kadaale ina udagalamo waxaa heleynin', 'Depression', 0.893909, '2026-05-14 04:52:01', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (7, 2, 'ogsonow waa dhaafi doontaa lakiin wey culuste', 'ogsonow waa dhaafi doontaa lakiin wey culuste', 'Depression', 0.92539, '2026-05-14 04:57:14', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (8, 2, 'mar wan ku walna lakiin hada maya', 'mar wan ku walna lakiin hada maya', 'Depression', 0.513583, '2026-05-14 05:44:40', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (9, 2, 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakin waxa arka ina iga xiiso dhacde', 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakin waxa arka ina iga xiiso dhacde', 'Depression', 0.950549, '2026-05-14 05:59:01', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (10, 2, 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakiin waxaa arkaa inaa iga xiiso dhacday', 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakiin waxaa arkaa inaa iga xiiso dhacday', 'Depression', 0.979022, '2026-05-14 06:01:47', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (11, 2, 'mar wan ku walna lakiin hada maya', 'mar wan ku walna lakiin hada maya', 'Depression', 0.513583, '2026-05-14 06:39:56', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (12, 2, 'aad baan uga daale dhibatoyin badan oo nolasha ah', 'aad baan uga daale dhibatoyin badan oo nolasha ah', 'Depression', 0.549586, '2026-05-14 06:55:19', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (13, 2, 'maanta waa farax sanahay', 'maanta waa farax sanahay', 'Neutral', 0.99282, '2026-05-14 06:56:06', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (14, 2, 'ogsonow waa dhaafi doontaa lakiin wey culuste', 'ogsonow waa dhaafi doontaa lakiin wey culuste', 'Depression', 0.92539, '2026-05-14 06:57:44', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (15, 4, 'maanta waa farax sanahay', 'maanta waa farax sanahay', 'Neutral', 0.99282, '2026-05-18 10:58:09', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (16, 4, 'maanta maalin fiican waye', 'maanta maalin fiican waye', 'Neutral', 0.995346, '2026-05-19 00:40:30', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (17, 4, 'aad baan uga daale dhibatoyin badan oo nolosha ah', 'aad baan uga daale dhibatoyin badan oo nolosha ah', 'Depression', 0.847263, '2026-05-19 00:42:38', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (18, 4, 'aduun waxaa kaquustay markaan waye qofkaa naftayda kajeclaa', 'aduun waxaa kaquustay markaan waye qofkaa naftayda kajeclaa', 'Depression', 0.970959, '2026-05-19 00:55:14', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (19, 4, 'ma oo yin lakiin gudahaa ka dhintay', 'ma oo yin lakiin gudahaa ka dhintay', 'Depression', 0.885993, '2026-05-19 02:42:24', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (20, 4, 'dhaawac walbo ii gesate wali waan ku ilobi la ahay', 'dhaawac walbo ii gesate wali waan ku ilobi la ahay', 'Depression', 0.95415, '2026-05-19 11:13:30', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (21, 2, 'cabsi aa daremoyaa', 'cabsi aa daremoyaa', 'Anxiety', 0.969393, '2026-05-20 10:48:15', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (24, 4, 'natiijada imtaxaanka ayaa walwal goni ah igu hayso wana ka baqayaaa inan eego najitadayda marks keeda', 'natiijada imtaxaanka ayaa walwal goni ah igu hayso wana ka baqayaaa inan eego najitadayda marks keeda', 'Anxiety', 0.957304, '2026-05-23 05:22:49', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (25, 4, 'maanta waa faraxsanahay', 'maanta waa faraxsanahay', 'Neutral', 0.998796, '2026-05-23 05:29:42', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (26, 3, 'walwalaa daremaa mana aqaan waxa qaldan', 'walwalaa daremaa mana aqaan waxa qaldan', 'Anxiety', 0.857797, '2026-06-01 04:14:41', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (27, 10, 'waa murugsanahay', 'waa murugsanahay', 'Neutral', 0.960259, '2026-06-01 08:02:45', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (28, 10, 'wayahaan danbe waxaa daremaa walwal iyo walbahaar', 'wayahaan danbe waxaa daremaa walwal iyo walbahaar', 'Depression', 0.599783, '2026-06-01 08:04:18', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (29, 10, 'waxaa cabsi kaqabaa inaa isdilo', 'waxaa cabsi kaqabaa inaa isdilo', 'Anxiety', 0.900916, '2026-06-01 08:04:48', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (30, 2, 'waa murugsanahay maalmahaan oo dhan', 'waa murugsanahay maalmahaan oo dhan', 'Neutral', 0.586709, '2026-06-08 22:08:43', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (31, 2, 'waa walwalsanahay waana cabsanooyaa', 'waa walwalsanahay waana cabsanooyaa', 'Depression', 0.820086, '2026-06-08 22:09:10', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (32, 2, 'murug aa dareemoyaa', 'murug aa dareemoyaa', 'Anxiety', 0.903127, '2026-06-14 10:03:57', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (33, 2, 'waa murugsanahay', 'waa murugsanahay', 'Anxiety', 0.712028, '2026-06-14 10:07:16', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (34, 1, 'hampalyo dhammaan ardeyda', 'hampalyo dhammaan ardeyda', 'Anxiety', 0.93614, '2026-06-15 01:52:29', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (35, 2, 'aad baan u faraxsanahy', 'aad baan u faraxsanahy', 'Neutral', 0.902717, '2026-06-15 11:44:47', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (36, 2, 'waa xanuunsanahy waana murugsanahy', 'waa xanuunsanahy waana murugsanahy', 'Anxiety', 0.718446, '2026-06-15 12:25:17', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (37, 2, 'qalbiga i xanuunooyo', 'qalbiga i xanuunooyo', 'Neutral', 0.688801, '2026-06-15 12:57:26', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (38, 2, 'qalbiga i xanuunooyo wa murugsanahay', 'qalbiga i xanuunooyo wa murugsanahay', 'Neutral', 0.93827, '2026-06-15 12:57:42', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (39, 2, 'wa murugsanahay maanta', 'wa murugsanahay maanta', 'Neutral', 0.657585, '2026-06-15 12:57:57', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (40, 2, 'waxa ka cabsanoyaa wax', 'waxa ka cabsanoyaa wax', 'Depression', 0.676052, '2026-06-15 12:58:27', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (41, 2, 'xanuun qalbi jab ah daremoya', 'xanuun qalbi jab ah daremoya', 'Neutral', 0.594369, '2026-06-16 07:02:11', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (42, 2, 'waa murugsanahay ayantan', 'waa murugsanahay ayantan', 'Anxiety', 0.62626, '2026-06-16 07:02:29', NULL, NULL, NULL);
INSERT INTO `predictions` (`id`, `user_id`, `input_text`, `cleaned_text`, `prediction_result`, `confidence_score`, `created_at`, `score`, `anxiety_level`, `recommendation`) VALUES (43, 2, 'waan murugsanahay manta', 'waan murugsanahay manta', 'Depression', 0.711736, '2026-06-18 05:50:38', NULL, NULL, NULL);

DROP TABLE IF EXISTS `recommendations`;
CREATE TABLE `recommendations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `input_text` text DEFAULT NULL,
  `prediction_result` varchar(50) DEFAULT NULL,
  `confidence_score` float DEFAULT NULL,
  `recommendation_json` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `recommendations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (1, 2, 'maanta waa maalin qurux badan waana faraxsanahay', 'Neutral', 0.993997, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-05-13 06:01:27');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (2, 2, 'waa faraxsanahay', 'Neutral', 0.92776, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-05-13 06:34:53');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (3, 2, 'maanta waa farax sanahay', 'Neutral', 0.99282, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-05-14 06:56:07');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (4, 4, 'maanta waa farax sanahay', 'Neutral', 0.99282, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-05-18 10:58:09');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (5, 4, 'maanta maalin fiican waye', 'Neutral', 0.995346, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-05-19 00:40:30');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (6, 4, 'maanta waa faraxsanahay', 'Neutral', 0.998796, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-05-23 05:29:42');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (7, 10, 'waa murugsanahay', 'Neutral', 0.960259, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-01 08:02:45');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (8, 2, 'waa murugsanahay maalmahaan oo dhan', 'Neutral', 0.586709, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-08 22:08:43');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (9, 2, 'murug aa dareemoyaa', 'Anxiety', 90.3128, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-14 10:03:57');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (10, 2, 'waa murugsanahay', 'Anxiety', 71.2028, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-14 10:07:16');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (11, 2, 'Detected Anxiety with 71% confidence.', 'Anxiety', 71.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 00:07:36');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (12, 1, 'Detected Anxiety with 71% confidence.', 'Anxiety', 71.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 00:09:25');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (13, 2, 'Detected Anxiety with 71% confidence.', 'Anxiety', 71.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 01:49:35');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (14, 1, 'Detected Anxiety with 71% confidence.', 'Anxiety', 71.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 01:50:12');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (15, 1, 'hampalyo dhammaan ardeyda', 'Anxiety', 93.614, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 01:52:30');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (16, 1, 'Detected Anxiety with 94% confidence.', 'Anxiety', 94.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 05:09:46');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (17, 1, 'Detected Anxiety with 94% confidence.', 'Anxiety', 94.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 05:16:37');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (18, 2, 'Detected Anxiety with 71% confidence.', 'Anxiety', 71.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 11:44:24');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (19, 2, 'aad baan u faraxsanahy', 'Neutral', 90.2717, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-15 11:44:47');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (20, 2, 'Detected Neutral with 90% confidence.', 'Neutral', 90.0, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-15 12:24:36');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (21, 2, 'waa xanuunsanahy waana murugsanahy', 'Anxiety', 71.8446, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 12:25:17');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (22, 2, 'Detected Anxiety with 72% confidence.', 'Anxiety', 72.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 12:56:44');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (23, 2, 'qalbiga i xanuunooyo', 'Neutral', 68.8801, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-15 12:57:27');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (24, 2, 'qalbiga i xanuunooyo wa murugsanahay', 'Neutral', 93.827, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-15 12:57:43');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (25, 2, 'wa murugsanahay maanta', 'Neutral', 65.7585, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-15 12:57:57');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (26, 2, 'waxa ka cabsanoyaa wax', 'Depression', 67.6052, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-15 12:58:28');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (27, 2, 'Detected Depression with 68% confidence.', 'Depression', 68.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-16 05:09:15');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (28, 2, 'Detected Depression with 68% confidence.', 'Depression', 68.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-16 06:32:49');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (29, 2, 'Detected Depression with 68% confidence.', 'Depression', 68.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-16 06:34:37');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (30, 2, 'Detected Depression with 68% confidence.', 'Depression', 68.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-16 07:01:39');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (31, 2, 'xanuun qalbi jab ah daremoya', 'Neutral', 59.4369, '["Practice deep breathing exercises for 5 minutes.", "Create a short walking routine to refresh your mind.", "Use a gratitude journal to focus on positive thoughts.", "Try a simple meditation before sleep.", "Stay hydrated and follow a balanced meal plan."]', '2026-06-16 07:02:12');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (32, 2, 'waa murugsanahay ayantan', 'Anxiety', 62.626, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-16 07:02:30');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (33, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-16 07:10:09');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (34, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-16 22:42:38');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (35, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 11:55:43');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (36, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 11:55:44');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (37, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 11:55:44');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (38, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 11:55:44');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (39, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:33:56');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (40, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:35:02');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (41, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:35:02');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (42, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:35:03');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (43, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:35:03');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (44, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:40:50');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (45, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:40:50');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (46, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:40:50');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (47, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:40:50');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (48, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:41:49');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (49, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:41:49');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (50, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:41:49');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (51, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:41:49');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (52, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 13:44:37');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (53, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:05:22');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (54, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:05:22');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (55, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:05:22');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (56, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:05:23');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (57, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:16');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (58, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:16');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (59, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:16');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (60, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:16');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (61, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:23');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (62, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:23');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (63, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:23');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (64, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 14:07:23');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (65, 2, 'Detected Anxiety with 63% confidence.', 'Anxiety', 63.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-17 23:57:06');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (66, 2, 'waan murugsanahay manta', 'Depression', 71.1736, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-18 05:50:38');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (67, 10, 'Detected Anxiety with 90% confidence.', 'Anxiety', 90.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-18 06:51:24');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (68, 2, 'Detected Depression with 71% confidence.', 'Depression', 71.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-18 07:12:07');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (69, 10, 'Detected Anxiety with 90% confidence.', 'Anxiety', 90.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-18 07:32:42');
INSERT INTO `recommendations` (`id`, `user_id`, `input_text`, `prediction_result`, `confidence_score`, `recommendation_json`, `created_at`) VALUES (70, 10, 'Detected Anxiety with 90% confidence.', 'Anxiety', 90.0, '["Reach out to a trusted support system today.", "Book a professional appointment for detailed care.", "Use grounding techniques to manage acute stress.", "Avoid caffeine and sugar before bedtime.", "Keep regular sleep and hydration habits."]', '2026-06-18 08:37:20');

DROP TABLE IF EXISTS `reports`;
CREATE TABLE `reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `report_id` varchar(100) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `doctor_id` int(11) DEFAULT NULL,
  `doctor_name` varchar(255) DEFAULT NULL,
  `prediction_type` varchar(50) DEFAULT 'Neutral',
  `prediction_confidence` int(11) DEFAULT 0,
  `status` varchar(50) DEFAULT 'Draft',
  `summary` text DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `report_data` longtext DEFAULT NULL,
  `downloads` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `prediction_result` varchar(50) DEFAULT 'Neutral',
  `confidence_score` float DEFAULT 0,
  `report_status` varchar(50) DEFAULT 'Draft',
  `exported_count` int(11) DEFAULT 0,
  `report_type` varchar(50) DEFAULT 'prediction',
  `prediction_id` int(11) DEFAULT NULL,
  `appointment_id` int(11) DEFAULT NULL,
  `payment_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_id` (`report_id`),
  KEY `user_id` (`user_id`),
  KEY `doctor_id` (`doctor_id`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (4, 'RPT-1', 2, 'batuulo aadan', NULL, NULL, 'Neutral', 99, 'completed', 'maanta waa maalin qurux badan waana faraxsanahay', 'maanta waa maalin qurux badan waana faraxsanahay', NULL, 0, '2026-05-13 06:01:27', '2026-05-28 09:52:23', 'Neutral', 0.993997, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (5, 'RPT-2', 2, 'batuulo aadan', NULL, NULL, 'Neutral', 93, 'completed', 'waa faraxsanahay', 'waa faraxsanahay', NULL, 0, '2026-05-13 06:34:53', '2026-05-28 09:52:23', 'Neutral', 0.92776, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (6, 'RPT-3', 2, 'batuulo aadan', NULL, NULL, 'Depression', 95, 'completed', 'waan daale', 'waan daale', NULL, 0, '2026-05-13 06:35:34', '2026-05-28 09:52:23', 'Depression', 0.949857, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (7, 'RPT-4', 2, 'batuulo aadan', NULL, NULL, 'Depression', 88, 'completed', 'aad baan ufaraxsanahay', 'aad baan ufaraxsanahay', NULL, 0, '2026-05-13 06:35:59', '2026-05-28 09:52:23', 'Depression', 0.884907, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (8, 'RPT-5', 2, 'batuulo aadan', NULL, NULL, 'Depression', 88, 'completed', 'aad baan ufaraxsanahay', 'aad baan ufaraxsanahay', NULL, 0, '2026-05-13 06:36:03', '2026-05-28 09:52:23', 'Depression', 0.884907, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (9, 'RPT-6', 2, 'batuulo aadan', NULL, NULL, 'Depression', 89, 'completed', 'waan kadaale ina udagalamo waxaa heleynin', 'waan kadaale ina udagalamo waxaa heleynin', NULL, 0, '2026-05-14 04:52:01', '2026-05-28 09:52:23', 'Depression', 0.893909, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (10, 'RPT-7', 2, 'batuulo aadan', NULL, NULL, 'Depression', 93, 'completed', 'ogsonow waa dhaafi doontaa lakiin wey culuste', 'ogsonow waa dhaafi doontaa lakiin wey culuste', NULL, 0, '2026-05-14 04:57:14', '2026-05-28 09:52:23', 'Depression', 0.92539, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (11, 'RPT-8', 2, 'batuulo aadan', NULL, NULL, 'Depression', 51, 'completed', 'mar wan ku walna lakiin hada maya', 'mar wan ku walna lakiin hada maya', NULL, 0, '2026-05-14 05:44:40', '2026-05-28 09:52:23', 'Depression', 0.513583, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (12, 'RPT-9', 2, 'batuulo aadan', NULL, NULL, 'Depression', 95, 'completed', 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakin waxa arka ina iga xiiso dhacde', 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakin waxa arka ina iga xiiso dhacde', NULL, 0, '2026-05-14 05:59:01', '2026-05-28 09:52:23', 'Depression', 0.950549, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (13, 'RPT-10', 2, 'batuulo aadan', NULL, NULL, 'Depression', 98, 'completed', 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakiin waxaa arkaa inaa iga xiiso dhacday', 'haa anaa aamusay waxaana sugayey inaa isoo radiso lakiin waxaa arkaa inaa iga xiiso dhacday', NULL, 0, '2026-05-14 06:01:47', '2026-05-28 09:52:23', 'Depression', 0.979022, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (14, 'RPT-11', 2, 'batuulo aadan', NULL, NULL, 'Depression', 51, 'completed', 'mar wan ku walna lakiin hada maya', 'mar wan ku walna lakiin hada maya', NULL, 0, '2026-05-14 06:39:56', '2026-05-28 09:52:23', 'Depression', 0.513583, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (15, 'RPT-12', 2, 'batuulo aadan', NULL, NULL, 'Depression', 55, 'completed', 'aad baan uga daale dhibatoyin badan oo nolasha ah', 'aad baan uga daale dhibatoyin badan oo nolasha ah', NULL, 0, '2026-05-14 06:55:19', '2026-05-28 09:52:23', 'Depression', 0.549586, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (16, 'RPT-13', 2, 'batuulo aadan', NULL, NULL, 'Neutral', 99, 'completed', 'maanta waa farax sanahay', 'maanta waa farax sanahay', NULL, 0, '2026-05-14 06:56:06', '2026-05-28 09:52:23', 'Neutral', 0.99282, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (17, 'RPT-14', 2, 'batuulo aadan', NULL, NULL, 'Depression', 93, 'completed', 'ogsonow waa dhaafi doontaa lakiin wey culuste', 'ogsonow waa dhaafi doontaa lakiin wey culuste', NULL, 0, '2026-05-14 06:57:44', '2026-05-28 09:52:23', 'Depression', 0.92539, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (18, 'RPT-15', 4, 'xasan', NULL, NULL, 'Neutral', 99, 'completed', 'maanta waa farax sanahay', 'maanta waa farax sanahay', NULL, 0, '2026-05-18 10:58:09', '2026-05-28 09:52:23', 'Neutral', 0.99282, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (19, 'RPT-16', 4, 'xasan', NULL, NULL, 'Neutral', 100, 'completed', 'maanta maalin fiican waye', 'maanta maalin fiican waye', NULL, 0, '2026-05-19 00:40:30', '2026-05-28 09:52:23', 'Neutral', 0.995346, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (20, 'RPT-17', 4, 'xasan', NULL, NULL, 'Depression', 85, 'completed', 'aad baan uga daale dhibatoyin badan oo nolosha ah', 'aad baan uga daale dhibatoyin badan oo nolosha ah', NULL, 0, '2026-05-19 00:42:38', '2026-05-28 09:52:23', 'Depression', 0.847263, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (21, 'RPT-18', 4, 'xasan', NULL, NULL, 'Depression', 97, 'completed', 'aduun waxaa kaquustay markaan waye qofkaa naftayda kajeclaa', 'aduun waxaa kaquustay markaan waye qofkaa naftayda kajeclaa', NULL, 0, '2026-05-19 00:55:14', '2026-05-28 09:52:23', 'Depression', 0.970959, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (22, 'RPT-19', 4, 'xasan', NULL, NULL, 'Depression', 89, 'completed', 'ma oo yin lakiin gudahaa ka dhintay', 'ma oo yin lakiin gudahaa ka dhintay', NULL, 0, '2026-05-19 02:42:24', '2026-05-28 09:52:23', 'Depression', 0.885993, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (23, 'RPT-20', 4, 'xasan', NULL, NULL, 'Depression', 95, 'completed', 'dhaawac walbo ii gesate wali waan ku ilobi la ahay', 'dhaawac walbo ii gesate wali waan ku ilobi la ahay', NULL, 0, '2026-05-19 11:13:30', '2026-05-28 09:52:23', 'Depression', 0.95415, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (24, 'RPT-21', 2, 'batuulo aadan', NULL, NULL, 'Anxiety', 97, 'completed', 'cabsi aa daremoyaa', 'cabsi aa daremoyaa', NULL, 0, '2026-05-20 10:48:15', '2026-05-28 09:52:23', 'Anxiety', 0.969393, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (25, 'RPT-24', 4, 'xasan', NULL, NULL, 'Anxiety', 96, 'completed', 'natiijada imtaxaanka ayaa walwal goni ah igu hayso wana ka baqayaaa inan eego najitadayda marks keeda', 'natiijada imtaxaanka ayaa walwal goni ah igu hayso wana ka baqayaaa inan eego najitadayda marks keeda', NULL, 0, '2026-05-23 05:22:49', '2026-05-28 09:52:23', 'Anxiety', 0.957304, 'completed', 0, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (26, 'RPT-25', 4, 'xasan', NULL, NULL, 'Neutral', 100, 'completed', 'maanta waa faraxsanahay', 'maanta waa faraxsanahay', NULL, 2, '2026-05-23 05:29:42', '2026-05-30 06:38:16', 'Neutral', 0.998796, 'completed', 2, 'prediction', NULL, NULL, NULL);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (27, 'PAY-20260601041644-3', 3, 'Guest User', NULL, NULL, 'Neutral', 0, 'Completed', 'Payment Transaction Report for Guest User. Amount: 5. Method: evc_plus. Status: Completed', 'Auto-generated report', '{"amount": 5.0, "paymentMethod": "evc_plus", "transactionId": "TXN-441153", "status": "Completed"}', 0, '2026-06-01 04:16:44', '2026-06-01 04:16:44', 'Neutral', 0.0, 'Draft', 0, 'payment', NULL, NULL, 5);
INSERT INTO `reports` (`id`, `report_id`, `user_id`, `user_name`, `doctor_id`, `doctor_name`, `prediction_type`, `prediction_confidence`, `status`, `summary`, `admin_notes`, `report_data`, `downloads`, `created_at`, `updated_at`, `prediction_result`, `confidence_score`, `report_status`, `exported_count`, `report_type`, `prediction_id`, `appointment_id`, `payment_id`) VALUES (28, 'PAY-20260601081147-10', 10, 'Guest User', NULL, NULL, 'Neutral', 0, 'Completed', 'Payment Transaction Report for Guest User. Amount: 5. Method: wafi. Status: Completed', 'Auto-generated report', '{"amount": 5.0, "paymentMethod": "wafi", "transactionId": "TXN-966497", "status": "Completed"}', 1, '2026-06-01 08:11:47', '2026-06-17 12:04:06', 'Neutral', 0.0, 'Draft', 1, 'payment', NULL, NULL, 6);

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `permissions` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `role_permissions` (`id`, `role_name`, `permissions`, `created_at`, `updated_at`) VALUES (1, 'role_1', '{"all": true}', '2026-06-09 01:29:50', '2026-06-09 01:29:50');

DROP TABLE IF EXISTS `security_logs`;
CREATE TABLE `security_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `action` varchar(50) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `username` varchar(255) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `browser` varchar(255) DEFAULT NULL,
  `device` varchar(255) DEFAULT NULL,
  `platform` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `security_logs` (`id`, `action`, `description`, `ip_address`, `created_at`, `username`, `role`, `browser`, `device`, `platform`, `status`) VALUES (1, 'LOGIN', 'IT Management Panel login successful', '127.0.0.1', '2026-06-18 13:48:04', 'superadmin', 'SUPER_ADMIN', 'Chrome', 'Desktop', 'web', 'SUCCESS');

DROP TABLE IF EXISTS `super_admins`;
CREATE TABLE `super_admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `super_admins` (`id`, `username`, `password`, `role`, `status`, `email`, `phone`, `fullname`, `created_at`) VALUES (1, 'superadmin', 'scrypt:32768:8:1$sWyOMJbHLGCtF3Sp$a6ad8331d59f599e2c6d027f2f8322c6860d8496808bd74ad5da7118925bc530e0d9fed4eb1264a392060d1bfafd21756989caa4c718fc404a2e4a548663c393', 'SUPER_ADMIN', 'active', 'superadmin@anxietycare.com', NULL, 'Super Admin', '2026-06-09 01:25:56');

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES (1, 'contact_email', 'Group40fourty@gmail.com', '2026-06-09 01:31:15', '2026-06-09 01:31:15');
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES (2, 'contact_phone', '+252614197803', '2026-06-09 01:31:15', '2026-06-09 01:31:15');
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES (3, 'maintenance_mode', 'false', '2026-06-09 01:31:15', '2026-06-09 01:31:15');
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES (4, 'max_users', '10000', '2026-06-09 01:31:15', '2026-06-09 01:31:15');
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES (5, 'session_timeout', '60', '2026-06-09 01:31:15', '2026-06-09 01:31:15');
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES (6, 'site_description', 'Mental Health Platform', '2026-06-09 01:31:15', '2026-06-09 01:31:15');
INSERT INTO `system_settings` (`id`, `setting_key`, `setting_value`, `created_at`, `updated_at`) VALUES (7, 'site_name', 'AnxietyCare', '2026-06-09 01:31:15', '2026-06-09 01:31:15');

DROP TABLE IF EXISTS `testimonials`;
CREATE TABLE `testimonials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `fullname` varchar(255) DEFAULT NULL,
  `phone` varchar(20) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'user',
  `status` varchar(50) NOT NULL DEFAULT 'Active',
  `avatar` varchar(500) DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `password_reset_token` varchar(255) DEFAULT NULL,
  `password_reset_expires` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `phone_verified` tinyint(1) DEFAULT 0,
  `otp_code` varchar(10) DEFAULT NULL,
  `otp_expires` datetime DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `verification_attempts` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `username_2` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (1, 'Group40', 'Admin User', '', 'group40@gmail.com', 'scrypt:32768:8:1$UnXxnTI8caG0PAiW$f47b42ed99d008481cbfa028c3b566cff864cf23f02945c692a463b2b1ce355999d4e776052daaf7b3d309f0a13f50780df8e024da818fa61f418cd52247944e', 'admin', 'Active', '/uploads/avatar_1_1781789038.jpg', NULL, NULL, NULL, NULL, '2026-05-13 05:57:57', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (2, 'batuulo01', 'batuulo aadan', '+252614197803', 'batuulo@gmail.com', 'scrypt:32768:8:1$dxeNULCYqIpaQy02$4b54fb30dba7cc55c7cf998aeba68b116d9f3cddebb01d1e02bfd2268c08a0db0bb5a2789fce481881b0db4245a7617b56715b77576d2341777796250bf39dfb', 'user', 'Active', NULL, 'Female', 22, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJleHAiOjE3ODE1NTI1NzF9.XApdJYTIuVlV0KxwM7um7Dk401_QsHtS5Tf5zg28Ufc', '2026-06-15 18:42:51', '2026-05-13 05:59:03', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (3, 'farax01', 'farax qaan', '', 'farax@gmail.com', 'scrypt:32768:8:1$hC9DGVAPNtlgNfPs$390a9e95a34fcdc62096ade4da67928d89489985814b40ee0af16dfcc81fdfd16f7aa522303a1ab2bea9d01ff5bb341a60e2dd487d60315fcb3d44bc2797b750', 'user', 'Inactive', NULL, NULL, NULL, NULL, NULL, '2026-05-14 09:25:15', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (4, 'xasan01', 'xasan', '', 'xasan@gmail.com', 'scrypt:32768:8:1$8xp7C0RhpHXKf6vs$59d44a2c1c7da854c5c45ec71ee3ca6336bac4abbe1e82fb2077111c1084eef4e25d5ec00a7c75f2139b79eca8b639ee473318477c0d445c8d05cfa2b890b0ae', 'user', 'Active', NULL, NULL, NULL, NULL, NULL, '2026-05-18 10:05:26', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (6, 'dr_cali', 'shacbaan ali', '', 'shacbaan@gmail.com', 'scrypt:32768:8:1$LcFtLmybhCHIUElL$b90a3b1cdb8a92e3680c4f83017b6b50e458f3286d8769bdd6d39b00328b0efdaee8238c202d7fcdd1aaa30a7aa474b4a31cfdbe8af82603e6c802ddb5c638a2', 'doctor', 'Inactive', NULL, NULL, NULL, NULL, NULL, '2026-05-20 02:37:03', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (9, 'docto_shucayb', 'qalaf', '', 'qalaf@gmail.com', 'scrypt:32768:8:1$h23XRRtjhBOSNL2G$2a6ff20fa215343457a6b4d90797d8302d77832d353a2764c114435b0862df6213f0443f2dc5344809b91b9238a4ea0130f4563a749086bc3869b933e3f0e210', 'doctor', 'Active', NULL, NULL, 0, NULL, NULL, '2026-06-01 07:50:47', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (10, 'hajaro01', 'hajaro', '', 'hajaro@gmail.com', 'scrypt:32768:8:1$J4qUNw18uQcLR5kL$891dfed83ac8e8c2f6de09397e36e6dfd2797d8d2b4ae96afec98559a1acf5a3241fca261e2b7ad7ccac479dba89ffa1c6e86958954af6219c260b5957f79b7c', 'user', 'Active', NULL, NULL, NULL, NULL, NULL, '2026-06-01 07:57:14', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (11, 'zamzam', 'zamzam ismail', '+252614197803', '', 'scrypt:32768:8:1$nTywQZo5lnI6lBFZ$d958c7f02aa438096831c47255704093bae129865960b0beec0b9edaf14ebbea2303eb6cc319e04e57bfcc4fb80e951fb49d4780a9b77c230ed75ccd56e55207', 'user', 'pending', NULL, 'Female', 20, NULL, NULL, '2026-06-14 10:44:41', 0, NULL, NULL, '2005-08-07', NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (14, 'firdowso', 'firdowso abdullahi', '+252612289239', NULL, 'scrypt:32768:8:1$li7piFLlughTC4rE$076b17f11c13a0e51b2ccc5348b29c3f51df754906e39264fb696ebd7254e2df1d9fa09e7f33201ab5dfa18af1b6d80dbfc9038503ad1aca69f7a883f2f9d215', 'user', 'pending', NULL, 'Female', 22, NULL, NULL, '2026-06-14 11:08:36', 0, NULL, NULL, '2004-06-02', NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (15, 'nuurto', 'nuurta macalin aadan', '+252614868907', NULL, 'scrypt:32768:8:1$pNjYZi9KYzHgYW3P$0c23b0c3814f6d749cede67c6986457d385d291e86fe227421e74843529f57835b318a297947fbe752ce777e3204c2ab538d00b3abb80c9677bf6e5802658719', 'user', 'pending', NULL, 'Female', 20, NULL, NULL, '2026-06-14 11:24:42', 0, '242638', '2026-06-14 18:38:57', '2006-06-01', NULL, NULL, NULL, 5);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (16, 'salmaan', 'salmaan abdijabar', '+252612231456', 'phone_252612231456@mobile.local', 'scrypt:32768:8:1$ddZLtJe1FrlfkQyT$c3b4bf5dd9cbbab8fa593957d085fd6eefea30ce4f3177d9a8bac5b3b929298246c10329256a69903167734f43857b79735dc03fb9e34424a6771f88a297021b', 'user', 'Active', NULL, 'Male', 26, NULL, NULL, '2026-06-17 13:46:45', 1, NULL, NULL, '2000-01-01', NULL, NULL, NULL, 0);
INSERT INTO `users` (`id`, `username`, `fullname`, `phone`, `email`, `password`, `role`, `status`, `avatar`, `gender`, `age`, `password_reset_token`, `password_reset_expires`, `created_at`, `phone_verified`, `otp_code`, `otp_expires`, `date_of_birth`, `address`, `district`, `city`, `verification_attempts`) VALUES (17, '', 'Ali adan Ali', '', 'ali@gmail.com', 'scrypt:32768:8:1$teIRHUApq1ryevwh$f3d057a456c54a3e1e212360ebe299e2ae033a0e5b6df493cce0b4974e64137be3d2d12844b4fa87c49d5ff8bf5ebd18469804bcbb92f9487c3c37772815e922', 'doctor', 'Active', NULL, NULL, NULL, NULL, NULL, '2026-06-18 07:34:55', 0, NULL, NULL, NULL, NULL, NULL, NULL, 0);

CREATE DATABASE IF NOT EXISTS `super_admins`;
USE `super_admins`;

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor_id` int(11) NOT NULL,
  `actor_role` enum('SUPER_ADMIN','ADMIN','DOCTOR','USER') NOT NULL,
  `action` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `backups`;
CREATE TABLE `backups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `backup_name` varchar(255) NOT NULL,
  `file_path` text NOT NULL,
  `file_size` bigint(20) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` enum('SUPER_ADMIN','ADMIN','DOCTOR','USER') NOT NULL,
  `can_manage_users` tinyint(1) DEFAULT 0,
  `can_manage_doctors` tinyint(1) DEFAULT 0,
  `can_manage_admins` tinyint(1) DEFAULT 0,
  `can_manage_payments` tinyint(1) DEFAULT 0,
  `can_manage_reports` tinyint(1) DEFAULT 0,
  `can_manage_settings` tinyint(1) DEFAULT 0,
  `can_manage_backups` tinyint(1) DEFAULT 0,
  `can_manage_roles` tinyint(1) DEFAULT 0,
  `can_view_audit_logs` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `role_permissions` (`id`, `role_name`, `can_manage_users`, `can_manage_doctors`, `can_manage_admins`, `can_manage_payments`, `can_manage_reports`, `can_manage_settings`, `can_manage_backups`, `can_manage_roles`, `can_view_audit_logs`, `created_at`) VALUES (1, 'SUPER_ADMIN', 1, 1, 1, 1, 1, 1, 1, 1, 1, '2026-06-09 00:35:43');
INSERT INTO `role_permissions` (`id`, `role_name`, `can_manage_users`, `can_manage_doctors`, `can_manage_admins`, `can_manage_payments`, `can_manage_reports`, `can_manage_settings`, `can_manage_backups`, `can_manage_roles`, `can_view_audit_logs`, `created_at`) VALUES (2, 'ADMIN', 1, 1, 0, 1, 1, 0, 0, 0, 0, '2026-06-09 00:35:43');
INSERT INTO `role_permissions` (`id`, `role_name`, `can_manage_users`, `can_manage_doctors`, `can_manage_admins`, `can_manage_payments`, `can_manage_reports`, `can_manage_settings`, `can_manage_backups`, `can_manage_roles`, `can_view_audit_logs`, `created_at`) VALUES (3, 'DOCTOR', 0, 0, 0, 0, 0, 0, 0, 0, 0, '2026-06-09 00:35:43');
INSERT INTO `role_permissions` (`id`, `role_name`, `can_manage_users`, `can_manage_doctors`, `can_manage_admins`, `can_manage_payments`, `can_manage_reports`, `can_manage_settings`, `can_manage_backups`, `can_manage_roles`, `can_view_audit_logs`, `created_at`) VALUES (4, 'USER', 0, 0, 0, 0, 0, 0, 0, 0, 0, '2026-06-09 00:35:43');

DROP TABLE IF EXISTS `security_logs`;
CREATE TABLE `security_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `super_admins`;
CREATE TABLE `super_admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fullname` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `avatar` longtext DEFAULT NULL,
  `status` enum('ACTIVE','SUSPENDED') DEFAULT 'ACTIVE',
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `super_admins` (`id`, `fullname`, `username`, `phone`, `password_hash`, `avatar`, `status`, `last_login`, `created_at`) VALUES (1, 'System Super Admin', 'superadmin', '0614197803', 'superadmin#superadmin', NULL, 'ACTIVE', NULL, '2026-06-09 00:34:32');

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS=1;
