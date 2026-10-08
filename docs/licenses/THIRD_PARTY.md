# Third-party licenses — frontend visual stack

> Inventario de las dependencias del frontend evaluadas en Step 6d (2026-10-02). Verificado contra `package.json`/LICENSE de los tarballs de npm. `apps/web` existe desde Step 7a; el inventario automático (license-checker en CI, Master Plan §40) queda pendiente.

| Paquete | Versión evaluada | Licencia | Notas |
|---|---|---|---|
| `@designcodeio/threeui` (Community) | 1.2.0 | MIT | assets propios MIT; fuentes incluidas SIL OFL 1.1; medios remotos de `threeui.com` **no** cubiertos; **Pro no se usa** (no está en npm). Ver [THREEUI_EVALUATION.md](../design/THREEUI_EVALUATION.md) |
| `gsap` | 3.15.0 | GSAP Standard "no charge" license (https://gsap.com/standard-license) | uso comercial gratuito incluidos todos los plugins (ScrollTrigger, SplitText…); prohibido usarlo para construir un editor visual de animaciones que compita con Webflow; sin atribución obligatoria. No es una licencia OSI |
| `@gsap/react` | 2.1.2 | misma licencia GSAP | `useGSAP` |
| `motion` | 13.5.0 | MIT | |
| `three` | 0.186.1 | MIT | **solo `labs/motion-lab`**: rechazado para Alpha (ADR-011) |
| `@react-three/fiber` | 9.8.1 | MIT | peer `react >=19 <19.4` · **solo `labs/motion-lab`**: rechazado para Alpha (ADR-011) |
| `@react-three/drei` | 10.7.9 | MIT | no usado (no hace falta sin R3F, ADR-011) |
| `ogl` | 1.0.11 | Unlicense | **solo `labs/motion-lab`**: rechazado para Alpha (ADR-011) |
| `lenis` | 1.3.26 | MIT | no se adopta por defecto |
| Geist / Geist Mono (`geist`) | 1.7.2 | SIL OFL 1.1 (© Vercel + basement.studio) | tipografía principal |
| Instrument Serif | (incluida en ThreeUI / Google Fonts) | SIL OFL 1.1 | solo si el lab la valida |
| `next-intl` (+ `use-intl`) | 4.14.9 | MIT | i18n de `apps/web` (Step 7a) |
| `zustand` | 5.0.15 | MIT | solo estado efímero de UI |
| `react-hook-form` | 7.89.0 | MIT | hoja "Cambiar tu uso" (diferida) |
| `@hookform/resolvers` | 5.9.1 | MIT | `zodResolver` |
| `@radix-ui/react-dialog` | 1.1.23 | MIT | `@vscar/ui/sheet` |
| `@radix-ui/react-slot` | 1.3.3 | MIT | `@vscar/ui/button` (`asChild`) |
| `server-only` | 0.0.1 | MIT | marca módulos solo-servidor |
| `@playwright/test` | 1.63.0 | Apache-2.0 | **solo desarrollo** (E2E con el Chrome instalado) |

Reglas: nada Pro sin licencia y decisión explícita; ningún componente que cargue librerías desde CDN; sin fotos de prensa ni logos de fabricantes (Master Plan §40).
