CREATE TABLE `jobs` (
	`id` char(36) NOT NULL,
	`type` varchar(64) NOT NULL,
	`payload` json NOT NULL,
	`status` enum('PENDING','RUNNING','SUCCESS','FAILED','DEAD') NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL,
	`run_at` datetime(3) NOT NULL,
	`locked_at` datetime(3),
	`locked_by` varchar(128),
	`claim_token` char(36),
	`heartbeat_at` datetime(3),
	`started_at` datetime(3),
	`finished_at` datetime(3),
	`last_error` text,
	`result` json,
	`idempotency_key` varchar(191),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobs_idempotency_key` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `jobs_ready` ON `jobs` (`status`,`run_at`);