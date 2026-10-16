# VScar — D1.1 Expansion Estimate: 100 candidatos (RDW + GIAVEH)

> Estado: **medido, no extrapolado** · 2026-10-16 · Datos: [`d11/expansion.json`](d11/expansion.json) · Consultas limitadas: RDW Basis + Energiebron por los 100 representantes D1 (8 consultas, lotes de 25 pares Va/Ve), GIAVEH CSV completo · **No es una importación.**

Las cifras salen de consultar los 100 candidatos reales; no hay tasas extrapoladas. Solo Basis + Energiebron (no Aandrijving, Carrosserie, As, Versnelling): las cifras de "después" no incluyen cilindros, tracción ni marchas.

## 1. Búsqueda

| | Resultado |
|---|---:|
| Candidatos con claves suficientes para buscar en RDW (TAN + Va + Ve) | **100 / 100** |
| RDW EXACT (TAN completo + Va + Ve) | **95** |
| RDW solo bajo otra extensión de TAN (no se usa) | 4 (Dacia Sandero #13, Peugeot 208 #22, Škoda Octavia #50, SEAT León #55) |
| RDW sin registro | 1 (Hyundai Tucson #21) |
| GIAVEH: TAN + tipo en el registro ES | 55 |
| GIAVEH: TAN con otro tipo | 2 |
| GIAVEH: TAN no encontrado | 43 (32 de 2025–2026: fichero de 2023-08) |
| Pueden **mejorar** con GIAVEH | 0 en datos técnicos (solo contraste de TAN) |

Identidad D1 × RDW: EXACT 4/4 · UNCONFIRMED 79/81 · AMBIGUOUS 12/15 con match técnico RDW EXACT.

## 2. Cobertura crítica (misma función que D1)

| | Media |
|---|---:|
| Antes (D1) | **17,6 %** |
| + EEA con la regla DGT existente (sin RDW) | 21,5 % |
| + RDW (Basis + Energiebron) | **54,3 %** |
| Solo los 95 EXACT | 17,3 % → 55,9 % |

Etiqueta DGT: 54 calculables solo con EEA + regla (BEV, HEV, PHEV con autonomía) · **40 necesitan la norma Euro de RDW** (ICE) · 6 sin etiqueta (sin match o norma desconocida).

| Powertrain | n | RDW EXACT | Antes | Después |
|---|---:|---:|---:|---:|
| ICE/MHEV | 47 | 42 | 20,6 % | 57,4 % |
| MHEV (indicado) | 3 | 3 | 15,4 % | 53,8 % |
| HEV/MHEV | 20 | 20 | 15,0 % | 53,8 % |
| PHEV | 10 | 10 | 17,5 % | 48,8 % |
| BEV | 20 | 20 | 13,6 % | 50,0 % |

| Periodo | n | RDW EXACT | Antes | Después |
|---|---:|---:|---:|---:|
| 2015–2018 | 15 | 15 | 18,9 % | 60,8 % |
| 2019–2021 | 17 | 17 | 16,1 % | 57,6 % |
| 2022–2024 | 33 | 28 | 19,1 % | 50,2 % |
| 2025–2026 | 35 | 35 | 16,4 % | 53,6 % |

### Por familia

| Familia | Candidatos | RDW EXACT | Cobertura crítica antes | Después |
|---|---:|---:|---:|---:|
| vw-golf | 7 | 7 | 19.3 % | 54.9 % |
| byd-seal | 2 | 2 | 14.3 % | 50.0 % |
| kia-sportage | 6 | 6 | 18.5 % | 57.1 % |
| renault-clio | 6 | 6 | 17.9 % | 57.7 % |
| nissan-qashqai | 4 | 4 | 17.3 % | 57.7 % |
| hyundai-tucson | 5 | 4 | 21.5 % | 52.3 % |
| dacia-sandero | 5 | 4 | 23.1 % | 53.8 % |
| hyundai-kona | 7 | 7 | 18.5 % | 56.6 % |
| peugeot-3008 | 6 | 6 | 16.3 % | 54.5 % |
| peugeot-208 | 5 | 4 | 16.7 % | 50.0 % |
| peugeot-308 | 2 | 2 | 23.1 % | 61.5 % |
| toyota-yaris | 3 | 3 | 17.9 % | 59.0 % |
| mercedes-a | 5 | 5 | 17.6 % | 57.7 % |
| skoda-octavia | 3 | 2 | 20.5 % | 46.2 % |
| audi-a3 | 2 | 2 | 19.2 % | 57.7 % |
| toyota-corolla | 3 | 3 | 15.4 % | 56.4 % |
| renault-megane | 4 | 4 | 16.8 % | 55.8 % |
| toyota-rav4 | 3 | 3 | 16.5 % | 55.1 % |
| kia-niro | 6 | 6 | 13.5 % | 51.1 % |
| seat-leon | 1 | 0 | 23.1 % | 23.1 % |
| bmw-3 | 1 | 1 | 15.4 % | 61.5 % |
| cupra-formentor | 2 | 2 | 20.9 % | 55.8 % |
| bmw-x3 | 5 | 5 | 15.6 % | 53.1 % |
| tesla-model-3 | 4 | 4 | 10.7 % | 50.0 % |
| tesla-model-y | 3 | 3 | 14.3 % | 50.0 % |

## 3. Qué seguiría faltando (sobre los 100, después de RDW)

| Clave crítica | Candidatos sin ella | Fuente |
|---|---:|---|
| `cap.boot_l` | 100 | S08 |
| `perf.accel_0_100_s` | 100 | S08 |
| precio | 100 | S08 |
| `war.years` | 100 | S08 |
| `pt.fuel_tank_l` | 80 | S08 / S10 |
| `perf.power_max_kw` (sistema, HEV/PHEV/BEV) | 53 | S08 |
| `chg.ac_max_kw` / `chg.dc_max_kw` | 30 / 20 | S08 |
| `nrg.fuel_charge_sustaining_l100` (PHEV) | 9 de 10 | S08 / S08-EU |
| dimensiones, plazas | 5 | sin match RDW EXACT |

**85 / 100** quedan con huecos **solo** en claves del fabricante (maletero, 0–100, precio, garantía, depósito, carga, potencia de sistema).

## 4. ¿Cuántos alcanzarían el criterio de curación?

Criterio (D1/ADR-018, sin cambios): identidad **EXACT** + claves críticas completas + derechos resueltos.

| Requisito | Con EEA + IDAE + RDW + GIAVEH |
|---|---:|
| Identidad técnica confirmada en dos registros oficiales | 95 |
| Identidad comercial EXACT | **4** (sin cambio: necesita CoC/ITV/código oficial) |
| Claves críticas completas | **0** (maletero, 0–100, precio y garantía no existen en estas fuentes) |
| **Alcanzan el criterio** | **0 %** |
| Siguen requiriendo CoC/ITV (o documento con código) para la identidad comercial | 96 |

## 5. Siguiente lote curable

Los **19 del piloto D2** (D1) que tienen RDW EXACT (todos salvo Peugeot 208 #22): cobertura media 18,8 % → **54,6 %** solo con fuentes públicas oficiales; lo restante es exclusivamente S08 + identidad comercial. Es el lote con mejor relación esfuerzo/resultado para D2, a condición de: (1) un documento por variante que enlace trim ↔ TAN+Va+Ve; (2) la decisión de derechos sobre S08 (o curación manual citada aprobada); (3) aprobación humana de S11 (RDW, evidencia CC0).
