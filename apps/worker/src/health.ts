import { createServer, type Server } from 'node:http';
import type { JobQueue } from '@vscar/db';
import { WORKER_VERSION, type WorkerState } from './worker.ts';

/**
 * Endpoint de salud (solo 127.0.0.1): estado, uptime, último job, profundidad de cola y versión.
 * No expone payloads, errores ni configuración.
 */
export function startHealthServer(opts: { host: string; port: number; state: WorkerState; queue: JobQueue; workerId: string }): Promise<Server> {
  const server = createServer(async (req, res) => {
    if (req.method !== 'GET' || (req.url !== '/health' && req.url !== '/')) {
      res.writeHead(404).end();
      return;
    }
    try {
      const stats = await opts.queue.stats();
      const body = {
        status: 'ok',
        worker_id: opts.workerId,
        worker_version: WORKER_VERSION,
        uptime_s: Math.round((Date.now() - opts.state.started_at) / 1000),
        last_job_at: opts.state.last_job_at,
        running_job: opts.state.running_job !== null,
        queue_depth: stats.queue_depth,
        jobs_by_status: stats.by_status,
      };
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    } catch {
      res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'degraded', worker_version: WORKER_VERSION }));
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, opts.host, () => resolve(server));
  });
}
