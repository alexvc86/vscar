-- Reversión manual de 0009_curation_hardening (Step D1.6a). drizzle-orm no ejecuta "down": aplicar a mano, en este
-- orden, y después borrar la fila correspondiente de `__drizzle_migrations`. Solo quita restricciones e índices de la
-- capa de curación técnica: no borra filas ni tablas, y no toca el catálogo seleccionable.
DROP INDEX `curated_import_items_technical_key` ON `curated_import_items`;
ALTER TABLE `curated_import_items` DROP FOREIGN KEY `curated_import_items_run_id_curated_import_runs_id_fk`;
ALTER TABLE `curated_technical_vehicles` DROP CHECK `curated_technical_vehicles_commercial_status`;
ALTER TABLE `curated_technical_vehicles` DROP CHECK `curated_technical_vehicles_curation_status`;
ALTER TABLE `curated_technical_vehicles` DROP CHECK `curated_technical_vehicles_identity_exact`;
ALTER TABLE `curated_spec_values` DROP CHECK `curated_spec_values_conflict`;
ALTER TABLE `curated_spec_values` DROP CHECK `curated_spec_values_quality`;
ALTER TABLE `curated_spec_values` DROP CHECK `curated_spec_values_authority`;
ALTER TABLE `curated_spec_values` DROP CHECK `curated_spec_values_rights`;
ALTER TABLE `curated_spec_values` DROP CHECK `curated_spec_values_identity`;
ALTER TABLE `curated_attributes` DROP CHECK `curated_attributes_rights`;
ALTER TABLE `curated_attributes` DROP CHECK `curated_attributes_kind_status`;
ALTER TABLE `curated_technical_vehicles` DROP INDEX `curated_technical_vehicles_identity`;
ALTER TABLE `curated_import_items` ADD UNIQUE INDEX `curated_import_items_key` (`batch_key`, `technical_key`);
ALTER TABLE `curated_import_items` DROP PRIMARY KEY;
