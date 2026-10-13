CREATE TABLE `variant_slug_aliases` (
	`market_code` char(2) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`variant_id` char(36) NOT NULL,
	`reason` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `variant_slug_aliases_market_slug` UNIQUE(`market_code`,`slug`)
);
--> statement-breakpoint
ALTER TABLE `reference_variants` DROP INDEX `reference_variants_market_slug_year`;--> statement-breakpoint
ALTER TABLE `reference_variants` ADD CONSTRAINT `reference_variants_market_slug` UNIQUE(`market_code`,`slug`);--> statement-breakpoint
ALTER TABLE `variant_slug_aliases` ADD CONSTRAINT `variant_slug_aliases_variant_id_reference_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `reference_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `variant_slug_aliases_variant` ON `variant_slug_aliases` (`variant_id`);