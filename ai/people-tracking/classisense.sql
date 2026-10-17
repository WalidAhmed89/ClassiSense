-- ==============================================================================
-- قاعدة بيانات مشروع: ClassiSense
-- مطابقة تماماً للجداول الموجودة على localhost XAMPP
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `classisense` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `classisense`;

-- ------------------------------------------------------------------------------
-- 1. جدول سجلات المراقبة الدورية (monitoring_logs)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `monitoring_logs`;

CREATE TABLE `monitoring_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `people_count` int(11) NOT NULL,
  `led_is_on` tinyint(1) NOT NULL,
  `led_on_seconds` int(11) NOT NULL,
  `temperature_c` decimal(5,2) DEFAULT NULL,
  `gas_detected` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. جدول الإنذارات والتنبيهات (alerts)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `alerts`;

CREATE TABLE `alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `alert_type` varchar(100) NOT NULL,
  `severity` varchar(50) NOT NULL,
  `measured_value` decimal(10,2) DEFAULT NULL,
  `triggered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
