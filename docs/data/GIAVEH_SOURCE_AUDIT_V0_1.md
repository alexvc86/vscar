# VScar — GIAVEH Source Audit v0.1 (Step D1.1)

> Estado: **SOURCE AUDIT PASS · usabilidad para enriquecimiento: NO** · 2026-10-16 · Código mínimo: `packages/data-connectors/src/giaveh/index.ts` · Manifiestos: [`d11/acquisition-manifests.json`](d11/acquisition-manifests.json)

## 1. Recurso

| Campo | Valor |
|---|---|
| Catálogo | https://datos.gob.es/es/catalogo/e05231501-consulta-fichas-reducidas1 ("Consulta Fichas Reducidas") |
| Publicador | Ministerio de Industria y Turismo (E05231501) — sistema GIAVEH |
| Distribuciones | CSV, XLSX y API REST (Swagger) |
| CSV | `Consulta Fichas Reducidas.csv` — **7.221.476 B**, SHA-256 `bfdde363…32fe0`, **`Last-Modified` 2023-08-31** (frecuencia declarada: diaria) |
| Registros | **88.032** |
| API | `GET /datosabiertosapi/GIAVEH/GetFichasReducidas` (paginada; documenta HTTP 429). Probada 2 veces: por marca → 200 con el mismo esquema; por contraseña con `*` → **HTTP 500** |

## 2. Schema real

| Columna CSV | API | Contenido | Uso |
|---|---|---|---|
| `Num F.R.` | `idExpediente` | número de ficha reducida | referencia |
| `Contraseña` | `contrasenaHomologacion` | TAN con extensión (`e1*2007/46*0623*35`) o contraseña nacional (`C.0390*00`) | clave |
| `Tipo` | `tipoFichaReducida` | tipo (p. ej. `AU`) | contraste con EEA `T` |
| `Fabricante` | `fabricante` | razón social **o nombre de persona física** (series cortas) | **descartado al leer** |
| `Marcas` | `marca` | marcas separadas por `;` | contraste |

**No hay variante (Va), versión (Ve), dimensiones, masas, plazas, motor, combustible, emisiones ni fechas.** La API devuelve exactamente los mismos cinco campos.

## 3. Usabilidad

- **Enriquecimiento técnico: no aporta nada.** No se ha construido un adapter de enriquecimiento; solo un lector de 30 líneas para medir la presencia de TAN.
- **Contraste de identidad**: permite comprobar que un TAN (con extensión) y su `Tipo` constan en el registro español. Resultado sobre los 100 candidatos: **55** TAN + tipo coinciden, **2** con tipo distinto, **43** no encontrados (32 de ellos de 2025–2026: el fichero no se actualiza desde 2023-08).
- No cambia ninguna identidad: confirma la homologación base, no la versión.

## 4. Derechos

| Campo | Valor |
|---|---|
| Source | S12 GIAVEH |
| License URL | https://sede.serviciosmin.gob.es/es-ES/Paginas/aviso.aspx#Reutilizacion |
| Condiciones (literal) | «Según el artículo 8 de la Ley 18/2015 … serán de aplicación las siguientes condiciones generales…: Que el contenido de la información, incluyendo sus metadatos, no sea alterado. Que no se desnaturalice el sentido de la información. Que se cite la fuente. Que se mencione la fecha de la última actualización.» |
| Commercial use | no excluido |
| Attribution | obligatoria (fuente + fecha de última actualización) |
| Redistribution | permitida con las condiciones anteriores; **datos personales** (`Fabricante` persona física) no se tratan |
| Abusos | «se reserva el derecho a realizar cambios técnicos … ante eventuales usos abusivos o robotizados» → solo 2 llamadas a la API |
| Verification date | 2026-10-16 |
| Reviewer status | Claude (asistente) — pendiente revisor humano; matriz: S12 registrada con ❓ |
