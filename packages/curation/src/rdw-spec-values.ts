import { createHash } from 'node:crypto';
import { Source, SpecValue, type ReferenceVariant, type SpecValueInput } from '@vscar/vehicle-schema';
import { RDW_SOURCE, type RdwObservation } from '@vscar/data-connectors';

/**
 * Observaciones RDW → `SpecValue` DRAFT validados con el schema real, para evaluarlos con `@vscar/quality`
 * (elegibilidad, completitud, conflictos). Solo para evaluación de D1.1: no se persisten.
 * Cross-market (D1 de Step 2): `source_market` NL, `reference_market` ES, `homologation_match` EXACT.
 */
const uuid = (s: string) => {
  const h = createHash('sha256').update(s).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${h.slice(18, 20)}-${h.slice(20, 32)}`;
};

export const RDW_SOURCE_RECORD: Source = Source.parse({
  id: uuid('source:S11:rdw'),
  code: 'S11',
  name: RDW_SOURCE.name,
  source_authority: 'OFFICIAL_AUTHORITY',
  market_code: 'NL',
  base_url: RDW_SOURCE.portal,
  notes: `${RDW_SOURCE.license}; ${RDW_SOURCE.attribution}`,
});

export function rdwSpecValues(observations: readonly RdwObservation[], variant: Pick<ReferenceVariant, 'id' | 'market_code'>, retrievedAt: string): { values: SpecValue[]; invalid: string[] } {
  const values: SpecValue[] = [];
  const invalid: string[] = [];
  for (const o of observations.filter((x) => x.target === 'spec')) {
    const input: SpecValueInput = {
      id: uuid(`rdw:${variant.id}:${o.key}:${o.externalField}:${o.sourceRecordIds.join(',')}`),
      variant_id: variant.id,
      spec_key: o.key,
      ...(o.value !== undefined ? { value: o.value } : { value_min: o.min!, value_max: o.max!, range_basis: o.rangeBasis ?? 'UNSPECIFIED' }),
      unit: o.unit ?? null,
      source_id: RDW_SOURCE_RECORD.id,
      source_url: `https://opendata.rdw.nl/d/${o.dataset}`,
      source_market: 'NL',
      reference_market: variant.market_code,
      source_authority: 'OFFICIAL_AUTHORITY',
      mapping_confidence: o.mappingConfidence,
      homologation_match: 'EXACT',
      retrieved_at: retrievedAt,
      ...(o.validFrom ? { valid_from: o.validFrom } : {}),
      ...(o.validTo ? { valid_to: o.validTo } : {}),
      ...(o.testCycle ? { test_cycle: o.testCycle } : {}),
      status: 'DRAFT',
      ...(o.measurementBasis ? { measurement_basis: o.measurementBasis } : {}),
      external_field: o.externalField,
      transformation: o.unit === 'kWh/100 km' ? 'unit_conversion' : 'identity',
      transformation_version: 1,
      notes: [`RDW ${o.sourceRecordIds.join(' ; ')}`, `revisions ${o.revisions.join(',')}`, ...o.notes].join(' · '),
    };
    const p = SpecValue.safeParse(input);
    if (p.success) values.push(p.data);
    else invalid.push(`${o.key} (${o.externalField}): ${p.error.issues.map((i) => i.message).join('; ')}`);
  }
  return { values, invalid };
}
