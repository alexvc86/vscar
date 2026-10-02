/**
 * Tokens de movimiento (VSCAR_VISUAL_DIRECTION_V0_1 §7). Única fuente de duraciones y easings del lab:
 * ningún componente escribe duraciones sueltas.
 */
export const MOTION = {
  vehicle_entry: { ms: 900, gsap: 'expo.out', css: [0.16, 1, 0.3, 1] as const, reduced_ms: 150 },
  versus_transition: { scrub: 0.2 },
  stat_reveal: { ms: 600, gsap: 'power3.out' },
  winner_reveal: { ms: 420, css: [0.16, 1, 0.3, 1] as const },
  result_lock: { ms: 420, css: [0.16, 1, 0.3, 1] as const, reduced_ms: 120 },
  tie_balance: { ms: 420, css: [0.45, 0, 0.55, 1] as const },
  comparison_shift: { ms: 320, css: [0.45, 0, 0.55, 1] as const },
  scenario_morph: { ms: 180, css: [0.33, 1, 0.68, 1] as const },
  section_enter: { ms: 700, stagger_ms: 60, gsap: 'power3.out' },
  metric_scrub: { scrub: 0.2 },
  card_hover: { ms: 160 },
  /** Móvil: −30 % de duración y stagger 40 ms (§11). */
  mobile_factor: 0.7,
  mobile_stagger_ms: 40,
  /** Atmósfera: velocidad máxima mientras se lee (§7). */
  atmosphere_speed: { HIGH: 0.3, LOW: 0.2 },
} as const;

export const sec = (ms: number, mobile = false) => (mobile ? ms * MOTION.mobile_factor : ms) / 1000;
