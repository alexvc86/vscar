/**
 * Used Adjustment v0.1 (Step 8a, methodology 2026.7). Reglas PROVISIONALES y públicas de la capa de usados.
 * Solo describen la unidad concreta: nunca cambian specs técnicas, nunca estiman fiabilidad, valor de
 * mercado, depreciación, mantenimiento, coste de reparación ni degradación de autonomía.
 * Cualquier umbral que convierta un dato en señal vive aquí (versionado), nunca en el engine.
 */
export const USED_ADJUSTMENT_RULES = {
  version: 'used-adjustment-v1',
  provisional: true,
  age: {
    /** Edad = meses completos desde la primera matriculación. Solo con el año: rango [31-dic, 1-ene]. */
    bases: ['REGISTRATION_DATE', 'REGISTRATION_YEAR'] as const,
    /** `registration_year_assumed` (ESTIMATED, p. ej. = model year) NUNCA se usa para calcular la edad. */
    use_assumed_registration_year: false,
  },
  mileage_for_age: {
    /**
     * Referencia de km/año por mercado. PROVISIONAL: es la distancia anual del escenario canónico ES
     * (ES-2026.10, 15.000 km/año), NO una media medida del parque. Calibrar con estadísticas de odómetro
     * (DGT/ITV) antes del MVP.
     */
    reference_annual_km: { ES: 15_000 } as Readonly<Record<string, number>>,
    reference_source: 'canonical ES scenario annual distance (ES-2026.10); provisional, not a measured fleet average',
    /** Señal HIGH_MILEAGE_FOR_AGE si TODO el rango de km/año supera referencia × factor. */
    high_above_factor: 1.5,
    /** Señal LOW_MILEAGE_FOR_AGE si TODO el rango de km/año queda por debajo de referencia × factor. */
    low_below_factor: 0.5,
    /** Con menos de 12 meses el ritmo anual no es estable: no se emite señal relativa. */
    min_age_months: 12,
  },
  warranty: {
    /** LIMITED_WARRANTY si queda garantía pero menos de N meses. */
    limited_below_months: 12,
    /**
     * Sin dato del usuario: garantía original (`war.years`/`war.km` de la variante) − edad/kilometraje →
     * CALCULATED (catálogo §16). Un resultado > 0 exige verificación (condiciones y transmisión).
     */
    calculate_from_original: true,
  },
  battery_health: {
    applies_to: ['BEV', 'PHEV', 'EREV'] as const,
    /**
     * BATTERY_HEALTH_LOW si el SOH declarado es inferior al mínimo garantizado de la variante
     * (`bat.warranty_soh_pct`) o, si no se conoce, a este valor de referencia (mínimo garantizado habitual
     * de las garantías de batería). PROVISIONAL. Nunca se convierte en autonomía.
     */
    low_below_pct_default: 70,
    low_below_source: 'typical manufacturer warranted minimum state of health; provisional',
    derive_range_from_soh: false,
  },
  condition: {
    /** Estado declarado → KNOWN_GOOD / KNOWN_ISSUES. ITV caducada = KNOWN_ISSUES. Desconocido ≠ malo. */
    good: ['excellent', 'good'] as const,
    issues: ['fair', 'poor'] as const,
  },
  /** Qué NO modela la capa (se declara en cada resultado). */
  not_modelled: ['MARKET_VALUE', 'DEPRECIATION', 'RESIDUAL_VALUE', 'MAINTENANCE_FORECAST', 'REPAIR_COST', 'FAILURE_PROBABILITY', 'RANGE_DEGRADATION'] as const,
} as const;

export type UsedNotModelled = (typeof USED_ADJUSTMENT_RULES.not_modelled)[number];
