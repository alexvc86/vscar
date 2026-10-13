import 'server-only';
import { resolveEnergyContext, type EnergyContext } from '@vscar/market-context';
import { allowedIn, SOURCE_RIGHTS, sourcePublication, type PublicationChannel } from '@vscar/quality';
import { EnergyPriceObservation } from '@vscar/vehicle-schema';
import energy from '@/data/energy-observations.snapshot.json';
import type { SourceInfo } from '@/domain/comparison-data';
import { MARKETS, type MarketCode } from '@/i18n/locales';

/**
 * Energía de referencia del mercado (Step 4g, sin cambios de método): observaciones reales de MITECO y ESIOS de la
 * fecha de referencia del mercado → `resolveEnergyContext`. Fuente: snapshot controlado de las observaciones
 * (Step 7a); el paso a `energy_prices` en MySQL es independiente del selector (ver DATA_ORCHESTRATION_V0_1).
 * Derechos: una observación cuya fuente no es publicable en el canal no entra en el contexto (ESIOS en PUBLIC).
 */
const HOSTS: Record<string, { code: string; key: 'esios' | 'miteco'; name: string }> = {
  'api.esios.ree.es': { code: 'S04', key: 'esios', name: 'Red Eléctrica — ESIOS (PVPC)' },
  'sedeaplicaciones.minetur.gob.es': { code: 'S03', key: 'miteco', name: 'MITECO — Geoportal de carburantes' },
};

const observations = energy.observations.map((o) => EnergyPriceObservation.parse(o));
const codeOf = (o: EnergyPriceObservation) => HOSTS[new URL(o.source_url).host]?.code;

export interface MarketEnergy {
  context: EnergyContext;
  sources: SourceInfo[];
  /** Versión de los datos de energía (fecha de referencia + fuente del snapshot). */
  version: string;
}

const cache = new Map<string, MarketEnergy>();

export function marketEnergy(market: MarketCode, channel: PublicationChannel): MarketEnergy {
  const m = MARKETS[market];
  const key = `${market}|${channel}|${m.energyRegion}|${m.energyDate}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const visible = observations.filter((o) => o.market_code === m.engineMarket && allowedIn(sourcePublication(codeOf(o), o.source_authority), channel));
  const context = resolveEnergyContext({ market: m.engineMarket as 'ES', region: m.energyRegion, date: m.energyDate }, visible);
  const sources = [...new Map(visible.map((o) => [o.source_id, o])).values()].map((o): SourceInfo => {
    const h = HOSTS[new URL(o.source_url).host]!;
    const publication = sourcePublication(h.code, o.source_authority);
    const attribution = SOURCE_RIGHTS[h.code]?.attribution;
    return { id: o.source_id, code: h.code, key: h.key, name: h.name, url: o.source_url, publication: publication === 'PUBLISHABLE' ? 'PUBLISHABLE' : 'PREVIEW_ONLY', ...(attribution ? { attribution } : {}) };
  });
  const entry = { context, sources, version: `${m.energyDate}@${energy._provenance.generated}` };
  cache.set(key, entry);
  return entry;
}
