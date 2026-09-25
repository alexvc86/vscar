import type { FuelProduct } from '@vscar/vehicle-schema';

/**
 * Reglas del Economics Engine (methodology 2026.3, `economics-v1`). Solo supuestos declarados y versionados:
 * ningún valor aquí es un dato oficial del coche.
 */
export const ECONOMICS_RULES = {
  version: 'economics-v1',

  /**
   * Eficiencia de carga (energía en batería / energía de red). ESTIMATED, no dato del vehículo.
   * Se aplica según `charging_loss_basis` del consumo eléctrico:
   * - EXCLUDED → consumo / eficiencia;
   * - INCLUDED → consumo tal cual (las pérdidas ya están dentro: aplicarla otra vez las contaría dos veces);
   * - UNSPECIFIED → rango [consumo, consumo / eficiencia] (no se elige en silencio).
   */
  charging_efficiency: { default: 0.9, min: 0.7, max: 1, status: 'ESTIMATED' as const },

  /** Producto de referencia por tipo de combustible del vehículo (el surtidor habitual). */
  fuel_product_by_fuel_type: { petrol: 'PETROL_95_E5', diesel: 'DIESEL_A', lpg: 'LPG' } as Readonly<Record<string, FuelProduct>>,

  /** Horizontes que siempre se informan (además del horizonte del escenario). */
  report_horizons_years: [1, 3, 5] as const,

  /**
   * Redondeo `money-v1`: cálculo sin redondear; cada importe ANUAL por componente se redondea a unidades menores
   * (HALF_UP, alejándose de cero); los acumulados a N años son sumas enteras de importes anuales redondeados.
   * Las tasas (€/100 km) no son importes: se informan con 4 decimales.
   */
  rounding: { version: 'money-v1', mode: 'HALF_UP' as const, rate_decimals: 4 },

  /**
   * Penalizaciones (puntos sobre 100) de la confianza económica. Niveles: HIGH ≥ 80, MEDIUM ≥ 55.
   * Mide cuánto depende el resultado de rangos, supuestos y datos incompletos; no es certeza financiera.
   */
  confidence: {
    thresholds: { high: 80, medium: 55 },
    penalties: {
      consumption_range: 15,
      cycle_not_wltp: 15,
      cycle_undeclared: 10,
      mapping_powertrain_level: 10,
      mapping_generation_level: 20,
      charging_loss_unspecified: 10,
      energy_price_fallback: 30,
      market_data_recent: 5,
      market_data_stale: 20,
      phev_electric_share_assumed: 15,
      purchase_price_missing: 10,
      maintenance_estimated: 5,
      maintenance_missing: 10,
      residual_missing: 10,
      residual_estimated: 5,
    },
  },

  /**
   * Sensibilidad determinista (una variable cada vez, sin Monte Carlo). Km, precios y años usan los
   * `SENSITIVITY_RANGES` del mercado; importes de la unidad usan variaciones relativas.
   */
  sensitivity: { purchase_price_rel: 0.1, maintenance_rel: 0.25, residual_rel: 0.2 },
} as const;
