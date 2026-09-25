import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { FetchLike } from '../src/index.ts';

/** Respuesta grabada de discodata ({ results: [...] }). */
export function recorded(name: string): { results: unknown[] } {
  const path = fileURLToPath(new URL(`./fixtures/eea/${name}.json`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as { results: unknown[] };
}

/** fetch falso que sirve una respuesta grabada (y registra las URLs pedidas). */
export function fakeFetch(body: unknown, calls: string[] = []): FetchLike {
  return async (url: string) => {
    calls.push(url);
    return { ok: true, status: 200, json: async () => body };
  };
}
