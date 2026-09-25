CREATE TABLE `homologations` (
	`id` char(36) NOT NULL,
	`market_code` char(2) NOT NULL,
	`type_approval_number` varchar(64),
	`variant_code` varchar(64),
	`version_code` varchar(128),
	`manufacturer_type_code` varchar(128),
	`valid_from` date NOT NULL,
	`valid_to` date,
	`test_cycle` varchar(24) NOT NULL,
	`emissions_standard_family` varchar(16) NOT NULL,
	`emissions_standard_level` varchar(16),
	`emissions_standard_raw` varchar(64),
	`homologation_powertrain` varchar(16) NOT NULL,
	`identification_confidence` varchar(16) NOT NULL,
	`source_id` char(36) NOT NULL,
	`source_url` varchar(2048) NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `homologations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incentives` (
	`id` char(36) NOT NULL,
	`market_code` char(2) NOT NULL,
	`region` varchar(32) NOT NULL,
	`program` varchar(64) NOT NULL,
	`amount_minor` bigint,
	`currency` char(3),
	`rule` text,
	`eligibility` text,
	`applies_to_variant_ids` json NOT NULL,
	`valid_from` date,
	`valid_to` date,
	`source_id` char(36) NOT NULL,
	`source_url` varchar(2048) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `incentives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reference_variants` (
	`id` char(36) NOT NULL,
	`market_code` char(2) NOT NULL,
	`commercial_group_key` varchar(255) NOT NULL,
	`canonical_key` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`manufacturer` varchar(64) NOT NULL,
	`model` varchar(64) NOT NULL,
	`generation_code` varchar(32) NOT NULL,
	`facelift` varchar(32),
	`trim_name` varchar(128) NOT NULL,
	`commercial_name` varchar(255) NOT NULL,
	`model_year` smallint NOT NULL,
	`body_type` varchar(16) NOT NULL,
	`sales_start` date,
	`sales_end` date,
	`price_list_date` date,
	`powertrain_type` varchar(8) NOT NULL,
	`fuel_type` varchar(16),
	`drivetrain` varchar(8) NOT NULL,
	`transmission` varchar(16) NOT NULL,
	`gears` varchar(16),
	`seats` tinyint,
	`doors` tinyint,
	`homologation_id` char(36) NOT NULL,
	`status` varchar(16) NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reference_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `reference_variants_canonical_key` UNIQUE(`canonical_key`),
	CONSTRAINT `reference_variants_homologation` UNIQUE(`homologation_id`),
	CONSTRAINT `reference_variants_market_slug_year` UNIQUE(`market_code`,`slug`,`model_year`)
);
--> statement-breakpoint
CREATE TABLE `safety_ratings` (
	`id` char(36) NOT NULL,
	`variant_id` char(36) NOT NULL,
	`authority` varchar(16) NOT NULL,
	`rating_status` varchar(16) NOT NULL,
	`stars` tinyint,
	`adult_pct` tinyint,
	`child_pct` tinyint,
	`vru_pct` tinyint,
	`assist_pct` tinyint,
	`protocol_version` varchar(64),
	`tested_year` smallint,
	`rating_valid_from` date,
	`rating_valid_to` date,
	`tested_powertrain` varchar(128),
	`tested_variant_note` text,
	`mapping_confidence` varchar(40) NOT NULL,
	`source_id` char(36) NOT NULL,
	`source_url` varchar(2048) NOT NULL,
	`archived` boolean NOT NULL,
	`archive_url` varchar(2048),
	`original_url` varchar(2048),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `safety_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` char(36) NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(255) NOT NULL,
	`source_authority` varchar(32) NOT NULL,
	`market_code` char(2) NOT NULL,
	`base_url` varchar(2048),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spec_values` (
	`id` char(36) NOT NULL,
	`variant_id` char(36) NOT NULL,
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
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spec_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vehicle_prices` (
	`id` char(36) NOT NULL,
	`variant_id` char(36) NOT NULL,
	`price_type` varchar(16) NOT NULL,
	`price_basis` varchar(16) NOT NULL,
	`amount_minor` bigint NOT NULL,
	`currency` char(3) NOT NULL,
	`incl_taxes` varchar(8) NOT NULL,
	`region` varchar(32) NOT NULL,
	`valid_from` date,
	`valid_to` date,
	`price_list_date` date,
	`source_id` char(36) NOT NULL,
	`source_url` varchar(2048) NOT NULL,
	`source_authority` varchar(32) NOT NULL,
	`archived` boolean NOT NULL,
	`archive_url` varchar(2048),
	`original_url` varchar(2048),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vehicle_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `homologations` ADD CONSTRAINT `homologations_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `incentives` ADD CONSTRAINT `incentives_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reference_variants` ADD CONSTRAINT `reference_variants_homologation_id_homologations_id_fk` FOREIGN KEY (`homologation_id`) REFERENCES `homologations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_ratings` ADD CONSTRAINT `safety_ratings_variant_id_reference_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `reference_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `safety_ratings` ADD CONSTRAINT `safety_ratings_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_values` ADD CONSTRAINT `spec_values_variant_id_reference_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `reference_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_values` ADD CONSTRAINT `spec_values_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_prices` ADD CONSTRAINT `vehicle_prices_variant_id_reference_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `reference_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vehicle_prices` ADD CONSTRAINT `vehicle_prices_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `homologations_eu_ids` ON `homologations` (`type_approval_number`,`variant_code`,`version_code`);--> statement-breakpoint
CREATE INDEX `reference_variants_group` ON `reference_variants` (`commercial_group_key`);--> statement-breakpoint
CREATE INDEX `reference_variants_search` ON `reference_variants` (`market_code`,`manufacturer`,`model`,`model_year`);--> statement-breakpoint
CREATE INDEX `safety_ratings_variant` ON `safety_ratings` (`variant_id`);--> statement-breakpoint
CREATE INDEX `spec_values_variant_key` ON `spec_values` (`variant_id`,`spec_key`);--> statement-breakpoint
CREATE INDEX `spec_values_source` ON `spec_values` (`source_id`);--> statement-breakpoint
CREATE INDEX `vehicle_prices_variant` ON `vehicle_prices` (`variant_id`);