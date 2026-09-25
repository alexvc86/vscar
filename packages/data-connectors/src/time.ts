/**
 * Utilidades de zona horaria sin dependencias (Intl). La hora oficial peninsular (Europe/Madrid) tiene días de
 * 23 h (último domingo de marzo) y 25 h (último domingo de octubre); los cambios nunca ocurren a medianoche.
 */
export const MADRID_TZ = 'Europe/Madrid';

const formatters = new Map<string, Intl.DateTimeFormat>();
const fmt = (timeZone: string) => {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(timeZone, f);
  }
  return f;
};

function localParts(utcMs: number, timeZone: string) {
  const p = Object.fromEntries(fmt(timeZone).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), mi: Number(p.minute), s: Number(p.second) };
}

/** Desfase (minutos) de la zona respecto a UTC en un instante. */
export function tzOffsetMinutes(utcMs: number, timeZone: string = MADRID_TZ): number {
  const l = localParts(utcMs, timeZone);
  return (Date.UTC(l.y, l.m - 1, l.d, l.h, l.mi, l.s) - Math.floor(utcMs / 1000) * 1000) / 60_000;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
export function isValidIsoDate(s: string): boolean {
  const m = ISO.exec(s);
  return !!m && new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toISOString().slice(0, 10) === s;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Instante UTC (ms) de las 00:00 locales del día. */
export function localMidnightUtc(isoDate: string, timeZone: string = MADRID_TZ): number {
  const guess = Date.parse(`${isoDate}T00:00:00Z`);
  let t = guess - tzOffsetMinutes(guess, timeZone) * 60_000;
  t = guess - tzOffsetMinutes(t, timeZone) * 60_000;
  return t;
}

/** Horas del día local: 23, 24 o 25. */
export function hoursInLocalDay(isoDate: string, timeZone: string = MADRID_TZ): number {
  return (localMidnightUtc(addDays(isoDate, 1), timeZone) - localMidnightUtc(isoDate, timeZone)) / 3_600_000;
}

/** Fecha local (`YYYY-MM-DD`) de un instante. */
export function localDate(utcMs: number, timeZone: string = MADRID_TZ): string {
  const l = localParts(utcMs, timeZone);
  return `${l.y}-${String(l.m).padStart(2, '0')}-${String(l.d).padStart(2, '0')}`;
}

/** Hora local sin zona `YYYY-MM-DDTHH:mm:ss` + desfase ISO (`+02:00`). */
export function localTimestamp(utcMs: number, timeZone: string = MADRID_TZ): { local: string; offset: string } {
  const l = localParts(utcMs, timeZone);
  const off = tzOffsetMinutes(utcMs, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  const sign = off >= 0 ? '+' : '-';
  return {
    local: `${l.y}-${pad(l.m)}-${pad(l.d)}T${pad(l.h)}:${pad(l.mi)}:${pad(l.s)}`,
    offset: `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`,
  };
}
