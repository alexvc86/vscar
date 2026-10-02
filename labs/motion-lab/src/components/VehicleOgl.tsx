'use client';
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl';
import { useEffect, useRef } from 'react';
import { BODY, WHEELS, WINDOW } from '@/lab/silhouette';
import { MOTION } from '@/lab/tokens';

/**
 * Alternativa OGL (2.5D): la misma silueta se rasteriza en un canvas 2D (nítida + desenfocada como campo
 * de altura) y un shader calcula normales e ilumina con una luz que barre la carrocería en la entrada.
 * Sin geometría 3D, sin texturas externas. Solo renderiza durante la entrada y al cambiar `lit`.
 */
const VERT = /* glsl */ `
attribute vec2 position; attribute vec2 uv; varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tMask; uniform sampler2D tHeight; uniform vec2 uTexel; uniform vec3 uColor;
uniform float uLight; uniform float uLit; uniform float uReveal; varying vec2 vUv;
void main() {
  vec4 m = texture2D(tMask, vUv);
  float body = m.r; float glass = m.g; float wheel = m.b;
  if (body + wheel < 0.01 || vUv.x > uReveal) { gl_FragColor = vec4(0.0); return; }
  float hL = texture2D(tHeight, vUv - vec2(uTexel.x, 0.0)).r; float hR = texture2D(tHeight, vUv + vec2(uTexel.x, 0.0)).r;
  float hD = texture2D(tHeight, vUv - vec2(0.0, uTexel.y)).r; float hU = texture2D(tHeight, vUv + vec2(0.0, uTexel.y)).r;
  vec3 n = normalize(vec3((hL - hR) * 9.0, (hD - hU) * 9.0, 1.0));
  vec3 l = normalize(vec3(uLight * 2.0 - 1.0, 0.7, 0.8));
  float diff = max(dot(n, l), 0.0);
  float spec = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
  float h = texture2D(tHeight, vUv).r;
  vec3 base = mix(vec3(0.07, 0.075, 0.085), uColor * 0.5, 0.2 + 0.4 * uLit) * (0.55 + 0.6 * h);
  float band = smoothstep(0.22, 0.0, abs(vUv.x - uLight)) * smoothstep(0.35, 0.75, 1.0 - vUv.y);
  vec3 c = base * (0.35 + 0.75 * diff) + vec3(0.95) * spec * (0.25 + 0.6 * uLit) + uColor * band * 0.35 * (0.3 + uLit);
  c = mix(c, vec3(0.03), glass * 0.85);
  c = mix(c, vec3(0.04) + uColor * 0.12 * uLit, wheel);
  float edge = smoothstep(uReveal - 0.04, uReveal, vUv.x);
  gl_FragColor = vec4(c, (1.0 - edge) * max(body, wheel));
}`;

const BODY_H = 384 / 424;

function rasterize(w: number, h: number, blur: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const path = (pts: readonly (readonly [number, number])[]) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * w, (1 - y) * h * BODY_H) : g.moveTo(x * w, (1 - y) * h * BODY_H)));
    g.closePath();
  };
  if (blur) g.filter = `blur(${blur}px)`;
  // R = carrocería, G = cristal, B = ruedas (en el campo de altura todo suma relieve en R).
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = '#ff0000';
  path(BODY);
  g.fill();
  if (!blur) {
    g.fillStyle = '#00ff00';
    path(WINDOW);
    g.fill();
  }
  g.fillStyle = blur ? '#ff0000' : '#0000ff';
  for (const wh of WHEELS) {
    g.beginPath();
    g.arc(wh.x * w, (1 - wh.y) * h * BODY_H, wh.r * h * BODY_H, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

export default function VehicleOgl({ color, lit, animate, mobile }: { color: [number, number, number]; lit: number; animate: boolean; mobile: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setLit: (v: number) => void } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5), alpha: true, premultipliedAlpha: false, antialias: true });
    const gl = renderer.gl;
    gl.canvas.setAttribute('aria-hidden', 'true');
    gl.canvas.className = 'vehicle-gl';
    el.appendChild(gl.canvas);
    const W = 1024;
    const H = Math.round((W * 1.1) / 2.6);
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      transparent: true,
      uniforms: {
        tMask: { value: new Texture(gl, { image: rasterize(W, H, 0), generateMipmaps: false }) },
        tHeight: { value: new Texture(gl, { image: rasterize(W, H, 40), generateMipmaps: false }) },
        uTexel: { value: [6 / W, 6 / H] },
        uColor: { value: color },
        uLight: { value: 0 },
        uLit: { value: lit },
        uReveal: { value: animate ? 0 : 1.05 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.render({ scene: mesh });
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let raf = 0;
    const draw = () => renderer.render({ scene: mesh });
    if (animate) {
      // vehicle_entry: barrido de luz + revelado, expo.out, una sola vez (el bucle se detiene al terminar).
      const dur = MOTION.vehicle_entry.ms * (mobile ? MOTION.mobile_factor : 1);
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        program.uniforms.uReveal!.value = e * 1.05;
        program.uniforms.uLight!.value = 0.15 + 0.6 * e;
        draw();
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      program.uniforms.uLight!.value = 0.75;
      draw();
    }
    api.current = {
      setLit: (v) => {
        program.uniforms.uLit!.value = v;
        draw();
      },
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      api.current = null;
      gl.canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
    // El contexto se crea una vez por montaje; `lit` se aplica abajo sin recrearlo.
  }, [animate, mobile]);

  useEffect(() => api.current?.setLit(lit), [lit]);
  return <div ref={host} className="vehicle-gl-host" aria-hidden="true" />;
}
