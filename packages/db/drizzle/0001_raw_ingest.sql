CREATE TABLE `raw_ingest` (
	`id` char(36) NOT NULL,
	`source_id` char(36) NOT NULL,
	`source_code` varchar(16) NOT NULL,
	`external_id` varchar(64) NOT NULL,
	`original_filename` varchar(255) NOT NULL,
	`file_path` varchar(1024) NOT NULL,
	`payload_hash` char(64) NOT NULL,
	`row_count` int NOT NULL,
	`request` json NOT NULL,
	`import_status` varchar(16) NOT NULL,
	`retrieved_at` date NOT NULL,
	`imported_at` timestamp,
	`error` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `raw_ingest_id` PRIMARY KEY(`id`),
	CONSTRAINT `raw_ingest_payload_hash` UNIQUE(`payload_hash`)
);
--> statement-breakpoint
ALTER TABLE `spec_values` ADD `raw_ingest_id` char(36);--> statement-breakpoint
ALTER TABLE `raw_ingest` ADD CONSTRAINT `raw_ingest_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_values` ADD CONSTRAINT `spec_values_raw_ingest_id_raw_ingest_id_fk` FOREIGN KEY (`raw_ingest_id`) REFERENCES `raw_ingest`(`id`) ON DELETE no action ON UPDATE no action;