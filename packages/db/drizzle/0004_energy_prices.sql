CREATE TABLE `energy_prices` (
	`id` char(36) NOT NULL,
	`market_code` char(2) NOT NULL,
	`energy_product` varchar(32) NOT NULL,
	`scope_type` varchar(16) NOT NULL,
	`scope_code` varchar(32) NOT NULL,
	`price_date` date NOT NULL,
	`observed_at` datetime NOT NULL,
	`source_timezone` varchar(64) NOT NULL,
	`statistic` varchar(16) NOT NULL,
	`value` double NOT NULL,
	`unit` varchar(16) NOT NULL,
	`currency` char(3) NOT NULL,
	`taxes` varchar(16) NOT NULL,
	`aggregation_method` varchar(40) NOT NULL,
	`distribution` json NOT NULL,
	`source_authority` varchar(32) NOT NULL,
	`derived_from_authority` varchar(32) NOT NULL,
	`source_id` char(36) NOT NULL,
	`source_url` varchar(2048) NOT NULL,
	`provisional` boolean NOT NULL,
	`retrieved_at` date NOT NULL,
	`raw_ingest_id` char(36) NOT NULL,
	`external_field` varchar(128) NOT NULL,
	`adapter_version` varchar(32) NOT NULL,
	`transformation_version` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `energy_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `energy_prices` ADD CONSTRAINT `energy_prices_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `energy_prices` ADD CONSTRAINT `energy_prices_raw_ingest_id_raw_ingest_id_fk` FOREIGN KEY (`raw_ingest_id`) REFERENCES `raw_ingest`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `energy_prices_lookup` ON `energy_prices` (`market_code`,`energy_product`,`scope_type`,`scope_code`,`price_date`);