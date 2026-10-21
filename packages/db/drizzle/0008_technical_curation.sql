CREATE TABLE `curated_attributes` (
	`id` char(36) NOT NULL,
	`vehicle_id` char(36) NOT NULL,
	`kind` varchar(16) NOT NULL,
	`attribute` varchar(32) NOT NULL,
	`value` varchar(255) NOT NULL,
	`status` varchar(16) NOT NULL,
	`source_code` varchar(16) NOT NULL,
	`source_record` varchar(512) NOT NULL,
	`retrieved_at` date NOT NULL,
	`rights_status` varchar(16) NOT NULL,
	`evidence` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `curated_attributes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curated_import_items` (
	`batch_key` varchar(64) NOT NULL,
	`technical_key` varchar(255) NOT NULL,
	`vehicle_id` char(36) NOT NULL,
	`item_hash` char(64) NOT NULL,
	`status` varchar(16) NOT NULL,
	`run_id` char(36) NOT NULL,
	`error` text,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `curated_import_items_key` UNIQUE(`batch_key`,`technical_key`)
);
--> statement-breakpoint
CREATE TABLE `curated_import_runs` (
	`id` char(36) NOT NULL,
	`batch_key` varchar(64) NOT NULL,
	`plan_hash` char(64) NOT NULL,
	`status` varchar(16) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3),
	`counts` json,
	`error` text,
	CONSTRAINT `curated_import_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curated_spec_values` (
	`id` char(36) NOT NULL,
	`vehicle_id` char(36) NOT NULL,
	`spec_key` varchar(64) NOT NULL,
	`value_kind` varchar(8),
	`value_num` double,
	`value_text` text,
	`value_bool` boolean,
	`value_min` double,
	`value_max` double,
	`range_basis` varchar(24),
	`unit` varchar(16),
	`source_id` char(36) NOT NULL,
	`source_url` varchar(2048) NOT NULL,
	`source_market` char(2) NOT NULL,
	`reference_market` char(2) NOT NULL,
	`archived` boolean NOT NULL,
	`archive_url` varchar(2048),
	`original_url` varchar(2048),
	`source_authority` varchar(32) NOT NULL,
	`mapping_confidence` varchar(40) NOT NULL,
	`homologation_match` varchar(16) NOT NULL,
	`retrieved_at` date NOT NULL,
	`valid_from` date,
	`valid_to` date,
	`test_cycle` varchar(24),
	`test_cycle_inferred` varchar(24),
	`cycle_evidence` text,
	`status` varchar(16) NOT NULL,
	`provisional` boolean NOT NULL,
	`measurement_basis` json,
	`external_field` varchar(128),
	`transformation` varchar(24),
	`transformation_version` int,
	`raw_ingest_id` char(36),
	`notes` text,
	`source_code` varchar(16) NOT NULL,
	`source_record` varchar(512) NOT NULL,
	`identity_match` varchar(24) NOT NULL,
	`rights_status` varchar(16) NOT NULL,
	`quality_status` varchar(16) NOT NULL,
	`quality_reasons` json NOT NULL,
	`conflict_status` varchar(16) NOT NULL,
	`conflict_group` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `curated_spec_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curated_technical_vehicles` (
	`id` char(36) NOT NULL,
	`market_code` char(2) NOT NULL,
	`technical_key` varchar(255) NOT NULL,
	`brand` varchar(64) NOT NULL,
	`model` varchar(128) NOT NULL,
	`type_approval_number` varchar(64) NOT NULL,
	`variant_code` varchar(64) NOT NULL,
	`version_code` varchar(128) NOT NULL,
	`identity_confidence` varchar(16) NOT NULL,
	`homologation_powertrain` varchar(16) NOT NULL,
	`product_class` varchar(16) NOT NULL,
	`fuel_type` varchar(16),
	`first_observed_year` smallint,
	`last_observed_year` smallint,
	`commercial_identity_status` varchar(16) NOT NULL,
	`curation_status` varchar(24) NOT NULL,
	`source_codes` json NOT NULL,
	`d1_candidate_id` char(36),
	`d1_rank` smallint,
	`blockers` json NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `curated_technical_vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `curated_technical_vehicles_key` UNIQUE(`market_code`,`technical_key`)
);
--> statement-breakpoint
ALTER TABLE `curated_attributes` ADD CONSTRAINT `curated_attributes_vehicle_id_curated_technical_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `curated_technical_vehicles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curated_spec_values` ADD CONSTRAINT `curated_spec_values_vehicle_id_curated_technical_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `curated_technical_vehicles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curated_spec_values` ADD CONSTRAINT `curated_spec_values_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `curated_spec_values` ADD CONSTRAINT `curated_spec_values_raw_ingest_id_raw_ingest_id_fk` FOREIGN KEY (`raw_ingest_id`) REFERENCES `raw_ingest`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `curated_attributes_vehicle` ON `curated_attributes` (`vehicle_id`,`attribute`);--> statement-breakpoint
CREATE INDEX `curated_spec_values_vehicle_key` ON `curated_spec_values` (`vehicle_id`,`spec_key`);--> statement-breakpoint
CREATE INDEX `curated_spec_values_source` ON `curated_spec_values` (`source_id`);--> statement-breakpoint
CREATE INDEX `curated_technical_vehicles_brand` ON `curated_technical_vehicles` (`brand`,`model`);