import { useCallback, useEffect, useState, type ComponentType } from 'react';
import type { VehiclePickerProps } from './VehiclePicker';

/**
 * Carga diferida del VehiclePicker SIN Suspense (Step 7b.2). `next/dynamic` usa `React.lazy`, y React 19 retrasa
 * ~300 ms la aparición de contenido suspendido: el selector tardaba ~350 ms en abrirse aunque el chunk ya estuviera
 * precargado. Aquí el módulo se importa tras `load` + inactividad (y las marcas se precargan); al abrir, el componente
 * ya está en memoria y se pinta en el mismo frame. Sigue siendo un chunk diferido (fuera del JS inicial).
 */
type PickerModule = typeof import('./VehiclePicker');
let modulePromise: Promise<PickerModule> | undefined;
const loadPicker = () => (modulePromise ??= import('./VehiclePicker'));

export function useVehiclePicker(market: string): { Picker?: ComponentType<VehiclePickerProps>; ensure: () => void } {
  const [Picker, setPicker] = useState<ComponentType<VehiclePickerProps>>();
  const take = useCallback(
    (m: PickerModule) => {
      m.prefetchPicker(market);
      setPicker(() => m.default);
    },
    [market],
  );
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      const go = () => !cancelled && void loadPicker().then((m) => !cancelled && take(m));
      if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 3000 });
      else setTimeout(go, 300);
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', run);
    };
  }, [take]);
  // Clic antes de la precarga: se carga ya y el selector se abre en cuanto llega.
  const ensure = useCallback(() => void loadPicker().then(take), [take]);
  return { ...(Picker ? { Picker } : {}), ensure };
}
