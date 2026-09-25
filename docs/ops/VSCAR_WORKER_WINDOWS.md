# VScarWorker en Windows Server 2022 (NSSM)

> Step 4d · Baseline: [VSCAR_MASTER_PLAN.md](../VSCAR_MASTER_PLAN.md) §35, §44 · Código: [`apps/worker`](../../apps/worker)
> **No ejecutar nada destructivo sobre servicios existentes** (IIS, MySQL, Memurai, AutoTrader, workers Python, MT5). VScarWorker solo usa su base `vscar_db`, su carpeta `C:\vscar\` y el puerto 127.0.0.1:8180.

## 1. Qué es

Proceso Node puro (sin frontend) que procesa la cola MySQL `jobs`:

| Tipo | Hace | Resultado |
|---|---|---|
| `EEA_IMPORT` | adapter EEA → raw ingest (`C:\vscar\data\raw\eea\<year>\<status>\<sha256>.json`) → candidatos DRAFT → MySQL (append-only) → calidad → conflictos | resumen en `jobs.result` |
| `QUALITY_CHECK` | plausibilidad + elegibilidad por categoría | PASS/WARNING/BLOCK por variant (no autocorrige) |
| `CONFLICT_SCAN` | recarga valores y ejecuta el Conflict Engine | `NO_CONFLICT` / `REVIEW_REQUIRED` (no resuelve oficial vs oficial) |
| `MITECO_IMPORT` (4e) | histórico diario MITECO → raw `C:\vscar\data\raw\miteco\<year>\snapshot\<sha256>.json.gz` (~0,8 MB/día) → `energy_prices` (append-only) | medianas por zona fiscal / CCAA / provincia; fecha no publicada → `DEAD` |
| `ESIOS_IMPORT` (4f) | fichero PVPC de un día (ESIOS archivo 70) → raw `C:\vscar\data\raw\esios\<year>\snapshot\<sha256>.json` (~10 KB/día) → `energy_prices` | media diaria del término de energía PVPC por zona (PCB / CYM); día no publicado → `DEAD` con `NOT_AVAILABLE_YET` |

Estados: `PENDING → RUNNING → SUCCESS | FAILED (reintento en run_at) | DEAD`. Reintentos 1 / 5 / 15 / 60 min (`backoff-v1`), `max_attempts` 5 por defecto. Errores de validación/esquema → `DEAD` directo (revisión). Lock atómico (`SELECT … FOR UPDATE SKIP LOCKED`), latido cada 30 s, recuperación de locks caducados (`WORKER_STALE_LOCK_MIN`, 30 por defecto).

## 2. Requisitos previos

- Node.js ≥ 22.18 (type stripping nativo: el worker se ejecuta desde TypeScript sin compilar). Comprobar: `node -v`.
- Repo desplegado en `C:\vscar\app` (o la ruta decidida por ADR) con `corepack pnpm install --frozen-lockfile --prod=false`.
- Carpetas: `C:\vscar\data\raw`, `C:\vscar\logs\worker`, `C:\vscar\logs\eea`, `C:\vscar\config`.
- Base y usuario MySQL propios (**nunca root**, nunca otras bases):

```sql
-- Ejecutar una vez como administrador de MySQL. No toca ninguna otra base.
CREATE DATABASE IF NOT EXISTS vscar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'vscar_app'@'127.0.0.1' IDENTIFIED BY '<contraseña-larga>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES, DROP ON vscar_db.* TO 'vscar_app'@'127.0.0.1';
```

- Migraciones: aplicar `packages/db/drizzle/*.sql` a `vscar_db` (en orden 0000 → 0005) con el migrador de drizzle o el cliente mysql.
- Registrar las fuentes S01 (EEA), S03 (MITECO) y S04 (ESIOS) en `sources` (la curación las crea; el worker nunca las inventa y un import sin su fuente termina en `DEAD`).

## 3. Fichero de entorno

`C:\vscar\config\worker.env` — **guardar en UTF-8 sin BOM** (no usar PowerShell `Set-Content`; usar un editor o `[IO.File]::WriteAllText(path, text, (New-Object Text.UTF8Encoding $false))`). Permisos NTFS: solo Administradores y la cuenta del servicio.

```ini
DATABASE_URL=mysql://vscar_app:<contraseña>@127.0.0.1:3306/vscar_db
VSCAR_DATA_DIR=C:\vscar\data
VSCAR_LOG_DIR=C:\vscar\logs
WORKER_POLL_MS=10000
WORKER_ID=vps-worker-1
WORKER_STALE_LOCK_MIN=30
WORKER_HEALTH_HOST=127.0.0.1
WORKER_HEALTH_PORT=8180
EEA_BASE_URL=https://discodata.eea.europa.eu/sql
EEA_TIMEOUT_MS=60000
MITECO_BASE_URL=https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes
MITECO_TIMEOUT_MS=180000
ESIOS_BASE_URL=https://api.esios.ree.es
ESIOS_TIMEOUT_MS=60000
# Opcional (el archivo PVPC es público). Si se usa, es un secreto: se enmascara en logs y en jobs.last_error.
ESIOS_TOKEN=
```

Los logs nunca contienen la contraseña (se enmascaran credenciales en URLs y claves sensibles).

## 4. Instalación del servicio (NSSM)

```bat
nssm install VScarWorker "C:\Program Files\nodejs\node.exe"
nssm set VScarWorker AppParameters "--env-file=C:\vscar\config\worker.env src\main.ts"
nssm set VScarWorker AppDirectory "C:\vscar\app\apps\worker"
nssm set VScarWorker DisplayName "VScar Worker"
nssm set VScarWorker Description "VScar jobs queue worker (EEA_IMPORT, QUALITY_CHECK, CONFLICT_SCAN)"
nssm set VScarWorker Start SERVICE_AUTO_START
nssm set VScarWorker AppStdout "C:\vscar\logs\worker\service-stdout.log"
nssm set VScarWorker AppStderr "C:\vscar\logs\worker\service-stderr.log"
nssm set VScarWorker AppRotateFiles 1
nssm set VScarWorker AppRotateOnline 1
nssm set VScarWorker AppRotateBytes 10485760
nssm set VScarWorker AppExit Default Restart
nssm set VScarWorker AppRestartDelay 10000
nssm set VScarWorker AppStopMethodSkip 0
nssm set VScarWorker AppStopMethodConsole 30000
```

- `AppStopMethodConsole` envía Ctrl+C: el worker termina el job en curso y sale (SIGINT). Si un job supera el plazo, NSSM lo mata y el job queda `RUNNING` hasta que otro worker lo recupere como lock caducado.
- Puertos: el servicio **no expone nada público**; el health escucha solo en `127.0.0.1:8180` (no ocupado por otros servicios del VPS).

## 5. Operación

```bat
nssm start VScarWorker
nssm stop VScarWorker
nssm restart VScarWorker
nssm status VScarWorker
curl http://127.0.0.1:8180/health
```

Respuesta de salud (sin datos sensibles):

```json
{"status":"ok","worker_id":"vps-worker-1","worker_version":"0.1.0","uptime_s":120,"last_job_at":"2026-09-24T14:30:00.000Z","running_job":false,"queue_depth":0,"jobs_by_status":{"SUCCESS":3}}
```

Logs: `C:\vscar\logs\worker\worker-YYYY-MM-DD.log` , `C:\vscar\logs\eea\eea-YYYY-MM-DD.log`, `C:\vscar\logs\miteco\miteco-YYYY-MM-DD.log` y `C:\vscar\logs\esios\esios-YYYY-MM-DD.log` (JSON lines: `job_id`, `type`, `attempt`, `started_at`, `duration_ms`, `result`, `error`). Retención 14–30 días mediante tarea de mantenimiento (§6).

## 6. Windows Task Scheduler (encolar, no ejecutar)

Task Scheduler **no procesa filas ni jobs**: solo encola; el worker procesa la cola.

```bat
REM Import anual/periódico del dataset EEA vigente (idempotente: misma clave → no se duplica)
node --env-file=C:\vscar\config\worker.env C:\vscar\app\apps\worker\src\cli\enqueue.ts eea-import --year 2024 --filters "{\"memberState\":\"ES\",\"make\":\"SEAT\"}" --variants <uuid1>,<uuid2>

REM Precios de carburantes MITECO: diario a las 06:00 (sin --date = ayer, hora peninsular; idempotente)
node --env-file=C:\vscar\config\worker.env C:\vscar\app\apps\worker\src\cli\enqueue.ts miteco-import

REM PVPC ESIOS: 06:00 el día en curso; 21:00 el de mañana (se publica ~20:15 del día anterior). Idempotente.
node --env-file=C:\vscar\config\worker.env C:\vscar\app\apps\worker\src\cli\enqueue.ts esios-import
node --env-file=C:\vscar\config\worker.env C:\vscar\app\apps\worker\src\cli\enqueue.ts esios-import --date <mañana YYYY-MM-DD>

REM Relleno de un rango de días PVPC (un job por día)
node --env-file=C:\vscar\config\worker.env C:\vscar\app\apps\worker\src\cli\enqueue.ts esios-import --from 2026-09-01 --to 2026-09-24

REM Relleno de un día concreto (p. ej. si el VPS estuvo parado)
node --env-file=C:\vscar\config\worker.env C:\vscar\app\apps\worker\src\cli\enqueue.ts miteco-import --date 2026-09-20

REM Revisión periódica de calidad / conflictos
node --env-file=C:\vscar\config\worker.env C:\vscar\app\apps\worker\src\cli\enqueue.ts conflict-scan --variants <uuid1>,<uuid2>
```

Tareas recomendadas: (1) encolado de imports (semanal/mensual; `--rerun` solo si se quiere reprocesar un import terminado); (2) mantenimiento de logs > 30 días; (3) watchdog opcional: `curl` a `/health` y `nssm restart VScarWorker` si no responde. Ejecutar de madrugada las importaciones pesadas.

## 7. Desinstalación / rollback

```bat
nssm stop VScarWorker
nssm remove VScarWorker confirm
```

No borra datos ni la base; los jobs `RUNNING` pendientes se recuperan al volver a arrancar (lock caducado).
