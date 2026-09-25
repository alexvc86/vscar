import { createDb, createJobQueue } from '@vscar/db';
import { loadConfig } from './config.ts';
import { HANDLERS } from './handlers.ts';
import { startHealthServer } from './health.ts';
import { createFileLogger } from './logger.ts';
import { createWorker } from './worker.ts';

/** Punto de entrada del servicio NSSM "VScarWorker". */
const config = loadConfig();
const logger = createFileLogger(config.logDir, { echo: true, secrets: config.secrets });
const handle = createDb(config.databaseUrl);
const queue = createJobQueue(handle.db);

const worker = createWorker({
  queue,
  handlers: HANDLERS,
  context: { db: handle.db, logger, rawDir: config.rawDir, eea: config.eea, miteco: config.miteco, esios: config.esios },
  logger,
  workerId: config.workerId,
  pollMs: config.pollMs,
  staleLockMinutes: config.staleLockMinutes,
  heartbeatMs: config.heartbeatMs,
  secrets: config.secrets,
});

const health = config.health.port > 0 ? await startHealthServer({ ...config.health, state: worker.state, queue, workerId: config.workerId }) : undefined;

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.log('worker', 'worker.signal', { signal });
  worker.stop();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGBREAK', () => shutdown('SIGBREAK'));

await worker.run();
health?.close();
await handle.close();
