import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { EnergyPriceObservation, type EnergyProduct, type PriceScopeType } from '@vscar/vehicle-schema';
import type { VscarDb } from './client.ts';
import * as t from './schema.ts';

type Row = typeof t.energyPrices.$inferSelect;

const toRow = (o: EnergyPriceObservation): typeof t.energyPrices.$inferInsert => ({
  ...o,
  observed_at: o.observed_at.replace('T', ' '),
});

const fromRow = (r: Row): EnergyPriceObservation =>
  EnergyPriceObservation.parse({
    ...r,
    observed_at: r.observed_at.replace(' ', 'T').slice(0, 19),
    created_at: undefined,
  });

export interface EnergyPriceQuery {
  market_code: string;
  scope_type: PriceScopeType;
  scope_code: string;
  products?: readonly EnergyProduct[];
  /** Rango de `price_date` (inclusive). */
  from?: string;
  to?: string;
}

/**
 * Repositorio de datos de mercado (energía). Frontera MySQL ↔ dominio: devuelve `EnergyPriceObservation`
 * validadas; `@vscar/market-context` construye el contexto a partir de ellas (sin conocer MITECO/ESIOS).
 */
export function createMarketDataRepository(db: VscarDb) {
  return {
    /** Append-only e idempotente por id; devuelve cuántas filas nuevas se insertaron. */
    async appendEnergyPrices(observations: readonly EnergyPriceObservation[]): Promise<number> {
      const parsed = observations.map((o) => EnergyPriceObservation.parse(o));
      if (parsed.length === 0) return 0;
      let inserted = 0;
      // Lotes: un import nacional produce ~450 filas.
      for (let i = 0; i < parsed.length; i += 200) {
        const batch = parsed.slice(i, i + 200);
        const existing = new Set(
          (await db.select({ id: t.energyPrices.id }).from(t.energyPrices).where(inArray(t.energyPrices.id, batch.map((o) => o.id)))).map((r) => r.id),
        );
        const fresh = batch.filter((o) => !existing.has(o.id));
        if (fresh.length === 0) continue;
        await db.insert(t.energyPrices).values(fresh.map(toRow)).onDuplicateKeyUpdate({ set: { id: sql`id` } });
        inserted += fresh.length;
      }
      return inserted;
    },

    /**
     * Observaciones de un ámbito. Si la fuente se reimportó con otro contenido para el mismo día, se devuelven
     * todas las versiones (más reciente primero); elegir es tarea del consumidor.
     */
    async loadEnergyPrices(q: EnergyPriceQuery): Promise<EnergyPriceObservation[]> {
      const rows = await db
        .select()
        .from(t.energyPrices)
        .where(
          and(
            eq(t.energyPrices.market_code, q.market_code),
            eq(t.energyPrices.scope_type, q.scope_type),
            eq(t.energyPrices.scope_code, q.scope_code),
            q.products?.length ? inArray(t.energyPrices.energy_product, [...q.products]) : undefined,
            q.from ? gte(t.energyPrices.price_date, q.from) : undefined,
            q.to ? lte(t.energyPrices.price_date, q.to) : undefined,
          ),
        )
        .orderBy(desc(t.energyPrices.price_date), t.energyPrices.energy_product, desc(t.energyPrices.retrieved_at), t.energyPrices.id);
      return rows.map(fromRow);
    },
  };
}

export type MarketDataRepository = ReturnType<typeof createMarketDataRepository>;
