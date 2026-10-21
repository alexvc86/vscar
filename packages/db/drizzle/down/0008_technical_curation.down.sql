-- Reversión manual de 0008_technical_curation (Step D1.6). drizzle-orm no ejecuta "down": aplicar a mano y, después,
-- borrar la fila correspondiente de `__drizzle_migrations`. Solo afecta a la capa de curación técnica: el catálogo
-- seleccionable (reference_variants, spec_values, …) no se toca.
DROP TABLE IF EXISTS `curated_import_items`;
DROP TABLE IF EXISTS `curated_import_runs`;
DROP TABLE IF EXISTS `curated_spec_values`;
DROP TABLE IF EXISTS `curated_attributes`;
DROP TABLE IF EXISTS `curated_technical_vehicles`;
