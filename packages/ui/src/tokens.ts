/**
 * Tokens de diseño VScar (Step 6d §5–7, validados en Step 6e). Fuente única para TS; `styles/tokens.css`
 * expone los mismos valores como variables CSS. Ningún componente escribe colores, duraciones ni easings sueltos.
 */
export const COLOR = {
  dark: {
    base: '#0B0C0E',
    surface: '#15171A',
    raised: '#1E2125',
    text: '#F2F1EC',
    muted: '#A3A6AD',
    subtle: '#7C8088',
    candidateA: '#8EC5FF',
    candidateB: '#E2BE8A',
    warning: '#F2994A',
    info: '#B9C3D0',
  },
  /** Preparado (Step 6d §5.2); Alpha se publica en oscuro. */
  light: {
    base: '#F4F3EF',
    surface: '#FFFFFF',
    raised: '#ECEBE6',
    text: '#141518',
    muted: '#5A5E66',
    subtle: '#6B6F77',
    candidateA: '#1F5FAF',
    candidateB: '#8A5A1C',
    warning: '#A24A00',
    info: '#4A5563',
  },
} as const;

export type CandidateSide = 'a' | 'b';

type Bezier = readonly [number, number, number, number];

/** Gramática de movimiento (Step 6d §7). `css` = cúbica equivalente para Motion/CSS; `gsap` = nombre GSAP. */
export const MOTION = {
  vehicle_entry: { ms: 900, gsap: 'expo.out', css: [0.16, 1, 0.3, 1] as Bezier, reduced_ms: 150 },
  versus_transition: { scrub: 0.2 },
  section_enter: { ms: 700, stagger_ms: 60, gsap: 'power3.out' },
  metric_scrub: { scrub: 0.2 },
  result_lock: { ms: 420, css: [0.16, 1, 0.3, 1] as Bezier, reduced_ms: 120 },
  tie_balance: { ms: 420, css: [0.45, 0, 0.55, 1] as Bezier },
  scenario_morph: { ms: 180, css: [0.33, 1, 0.68, 1] as Bezier },
  sheet: { ms: 240, css: [0.16, 1, 0.3, 1] as Bezier },
  card_hover: { ms: 160 },
  /** Móvil: −30 % de duración, stagger 40 ms, mitad de desplazamiento (Step 6d §11). */
  mobile_factor: 0.7,
  mobile_stagger_ms: 40,
  mobile_distance_factor: 0.5,
  /** Atmósfera: velocidad máxima mientras se lee. */
  atmosphere_speed: { HIGH: 0.3, LOW: 0.2 },
  /** Recálculo del escenario (Step 6d §3.6). */
  scenario_debounce_ms: 250,
} as const;

export const seconds = (ms: number, mobile = false) => (mobile ? ms * MOTION.mobile_factor : ms) / 1000;
