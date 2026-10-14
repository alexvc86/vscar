CREATE TABLE `vehicle_model_media` (
	`id` char(36) NOT NULL,
	`brand` varchar(64) NOT NULL,
	`model` varchar(64) NOT NULL,
	`generation_code` varchar(32),
	`model_year_from` smallint,
	`model_year_to` smallint,
	`role` varchar(16) NOT NULL,
	`media_type` varchar(8) NOT NULL,
	`asset_path` varchar(255),
	`external_url` varchar(2048),
	`width` smallint NOT NULL,
	`height` smallint NOT NULL,
	`origin` varchar(24) NOT NULL,
	`rights_status` varchar(16) NOT NULL,
	`source_id` char(36),
	`attribution` varchar(255),
	`license` varchar(255),
	`verified_at` date,
	`alt` varchar(16) NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicle_model_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vehicle_model_media` ADD CONSTRAINT `vehicle_model_media_source_id_sources_id_fk` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `vehicle_model_media_model` ON `vehicle_model_media` (`brand`,`model`,`role`);