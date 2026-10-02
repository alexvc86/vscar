'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, ExtrudeGeometry, Shape, type Group, type MeshStandardMaterial } from 'three';
import { ASPECT, BODY, WHEELS, WINDOW } from '@/lab/silhouette';
import { MOTION } from '@/lab/tokens';

/**
 * Experimento controlado R3F: la MISMA silueta extruida (sin GLTF, sin texturas, sin assets externos),
 * luces de estudio y un giro corto de entrada. frameloop="demand": solo hay frames durante la entrada.
 */
function shapeOf(points: readonly (readonly [number, number])[]) {
  const s = new Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo((x - 0.5) * ASPECT, y) : s.moveTo((x - 0.5) * ASPECT, y)));
  s.closePath();
  return s;
}

function Car({ color, lit, animate, mobile }: { color: string; lit: number; animate: boolean; mobile: boolean }) {
  const group = useRef<Group>(null);
  const body = useRef<MeshStandardMaterial>(null);
  const { invalidate } = useThree();
  const t0 = useRef<number | null>(null);
  const dur = (MOTION.vehicle_entry.ms * (mobile ? MOTION.mobile_factor : 1)) / 1000;
  const geo = useMemo(() => {
    const bodyGeo = new ExtrudeGeometry(shapeOf(BODY), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 3, curveSegments: 4 });
    bodyGeo.translate(0, 0, -0.45);
    const glassGeo = new ExtrudeGeometry(shapeOf(WINDOW), { depth: 0.98, bevelEnabled: false });
    glassGeo.translate(0, 0.004, -0.49);
    return { bodyGeo, glassGeo };
  }, []);
  useEffect(() => () => {
    geo.bodyGeo.dispose();
    geo.glassGeo.dispose();
  }, [geo]);
  useEffect(() => {
    if (body.current) body.current.emissiveIntensity = 0.03 + 0.1 * lit;
    invalidate();
  }, [lit, invalidate]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    if (!animate) {
      g.rotation.y = -0.32;
      return;
    }
    t0.current ??= state.clock.elapsedTime;
    const p = Math.min(1, (state.clock.elapsedTime - t0.current) / dur);
    const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    g.rotation.y = -0.9 + 0.58 * e;
    g.position.x = (1 - e) * -0.6;
    if (p < 1) invalidate();
  });

  return (
    <group ref={group} position={[0, -0.45, 0]}>
      <mesh geometry={geo.bodyGeo}>
        <meshStandardMaterial ref={body} color="#2A2F36" metalness={0.35} roughness={0.38} emissive={new Color(color)} emissiveIntensity={0.03 + 0.1 * lit} />
      </mesh>
      <mesh geometry={geo.glassGeo}>
        <meshStandardMaterial color="#07080a" metalness={0.9} roughness={0.08} />
      </mesh>
      {WHEELS.map((w) => (
        <mesh key={w.x} position={[(w.x - 0.5) * ASPECT, w.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[w.r, w.r, 1.0, mobile ? 16 : 28]} />
          <meshStandardMaterial color="#0B0C0E" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default function VehicleSilhouetteR3F(props: { color: string; lit: number; animate: boolean; mobile: boolean }) {
  return (
    <Canvas
      className="vehicle-gl"
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, props.mobile ? 1 : 1.5]}
      gl={{ antialias: !props.mobile, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: [0, 0.35, 3.3], fov: 32 }}
      fallback={null}
    >
      <hemisphereLight args={['#F2F1EC', '#0B0C0E', 0.6]} />
      <directionalLight position={[3, 4, 3]} intensity={2.2} />
      <directionalLight position={[-4, 1.5, -3]} intensity={2.5} color={props.color} />
      <Car {...props} />
    </Canvas>
  );
}
