ALTER TABLE `raw_ingest` ADD `query_hash` char(64);--> statement-breakpoint
ALTER TABLE `raw_ingest` ADD `dataset_year` smallint;--> statement-breakpoint
ALTER TABLE `raw_ingest` ADD `dataset_status` varchar(16);--> statement-breakpoint
ALTER TABLE `raw_ingest` ADD `source_table` varchar(128);--> statement-breakpoint
ALTER TABLE `raw_ingest` ADD `registry_version` varchar(32);--> statement-breakpoint
ALTER TABLE `raw_ingest` ADD `adapter_version` varchar(32);--> statement-breakpoint
ALTER TABLE `raw_ingest` ADD `transformation_version` int;