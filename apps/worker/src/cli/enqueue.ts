import { parseArgs } from 'node:util';
import { createDb, createJobQueue } from '@vscar/db';
import { loadConfig } from '../config.ts';
import { addDays, localDate, mitecoLatestAvailableDate } from '@vscar/data-connectors';
import {
  EeaImportPayload,
  EsiosImportPayload,
  MitecoImportPayload,
  VariantScanPayload,
  eeaImportIdempotencyKey,
  esiosImportIdempotencyKey,
  mitecoImportIdempotencyKey,
} from '../handlers.ts';

/**
 * CLI de encolado para Windows Task Scheduler (no ejecuta jobs: solo los encola; el worker procesa la cola).
 *   node src/cli/enqueue.ts eea-import --year 2024 --filters '{"memberState":"ES","make":"SEAT"}' [--status FINAL_OR_PROVISIONAL] [--variants id1,id2] [--rerun]
 *   node src/cli/enqueue.ts quality-check --variants id1,id2
 *   node src/cli/enqueue.ts conflict-scan --variants id1,id2
 *   node src/cli/enqueue.ts miteco-import [--date YYYY-MM-DD] [--provinces 28,08] [--rerun]   (por defecto: ayer, hora peninsular)
 *   node src/cli/enqueue.ts esios-import [--date YYYY-MM-DD | --from YYYY-MM-DD --to YYYY-MM-DD] [--rerun]   (por defecto: hoy; un job por día)
 */
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    year: { type: 'string' },
    status: { type: 'string' },
    filters: { type: 'string' },
    variants: { type: 'string' },
    date: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    provinces: { type: 'string' },
    rerun: { type: 'boolean', default: false },
  },
});

const config = loadConfig();
const handle = createDb(config.databaseUrl);
const queue = createJobQueue(handle.db);
const variantIds = values.variants ? values.variants.split(',').map((s) => s.trim()).filter(Boolean) : [];

try {
  const kind = positionals[0];
  if (kind === 'eea-import') {
    const payload = EeaImportPayload.parse({
      year: Number(values.year),
      ...(values.status ? { status_preference: values.status } : {}),
      filters: JSON.parse(values.filters ?? '{}'),
      variant_ids: variantIds,
    });
    const r = await queue.enqueue('EEA_IMPORT', payload, { idempotencyKey: eeaImportIdempotencyKey(payload), rerunFinished: values.rerun });
    process.stdout.write(`${JSON.stringify({ job_id: r.job.id, created: r.created, status: r.job.status, key: r.job.idempotency_key })}\n`);
  } else if (kind === 'miteco-import') {
    const payload = MitecoImportPayload.parse({
      date: values.date ?? mitecoLatestAvailableDate(),
      provinces: values.provinces ? values.provinces.split(',').map((s) => s.trim()).filter(Boolean) : [],
    });
    const r = await queue.enqueue('MITECO_IMPORT', payload, { idempotencyKey: mitecoImportIdempotencyKey(payload), rerunFinished: values.rerun });
    process.stdout.write(`${JSON.stringify({ job_id: r.job.id, created: r.created, status: r.job.status, key: r.job.idempotency_key })}\n`);
  } else if (kind === 'esios-import') {
    const from = values.from ?? values.date ?? localDate(Date.now());
    const to = values.to ?? from;
    const days: string[] = [];
    for (let d = from; d <= to && days.length <= 366; d = addDays(d, 1)) days.push(d);
    if (days.length > 366) throw new Error('esios-import: range longer than one year');
    for (const date of days) {
      const payload = EsiosImportPayload.parse({ date });
      const r = await queue.enqueue('ESIOS_IMPORT', payload, { idempotencyKey: esiosImportIdempotencyKey(payload), rerunFinished: values.rerun });
      process.stdout.write(`${JSON.stringify({ job_id: r.job.id, created: r.created, status: r.job.status, key: r.job.idempotency_key })}\n`);
    }
  } else if (kind === 'quality-check' || kind === 'conflict-scan') {
    const payload = VariantScanPayload.parse({ variant_ids: variantIds });
    const r = await queue.enqueue(kind === 'quality-check' ? 'QUALITY_CHECK' : 'CONFLICT_SCAN', payload);
    process.stdout.write(`${JSON.stringify({ job_id: r.job.id, created: r.created })}\n`);
  } else {
    throw new Error('usage: enqueue.ts <eea-import|miteco-import|esios-import|quality-check|conflict-scan> [options]');
  }
} finally {
  await handle.close();
}
