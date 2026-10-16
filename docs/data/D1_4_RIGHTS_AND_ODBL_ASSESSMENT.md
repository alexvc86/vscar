# VScar — D1.4 Derechos: ODbL (gor3a), origen autoevolution y Opendatabay

> Estado: **propuesta para revisión jurídica · ningún cambio a PUBLIC** · 2026-10-16 · Matriz: S14 ❓ · S15 ❌ · No es asesoramiento legal

## 1. Dos preguntas distintas

| Pregunta | Respuesta |
|---|---|
| ¿La ODbL 1.0 permite el uso comercial? | **Sí, en principio**, con obligaciones (atribución, share-alike de bases derivadas usadas públicamente, "keep open") |
| ¿Está acreditado que gor3a puede conceder esos derechos sobre todo el contenido? | **No.** El propio repositorio dice que los datos se "compilaron y normalizaron" desde autoevolution.com, y no aporta licencia ni permiso del origen. La ODbL no garantiza titularidad: el licenciante no da garantías sobre los derechos |

La primera respuesta no resuelve la segunda.

## 2. ODbL 1.0 aplicada a VScar

| Concepto ODbL | Significado | Consecuencia para VScar |
|---|---|---|
| Atribución (§4.2–4.3) | aviso en cualquier uso público de la base o de un *Produced Work* | pie "Contiene información de vehicle-makes-models (gor3a), ODbL 1.0; origen autoevolution.com" en páginas y exportaciones |
| *Derivative/Adapted Database* (§4.4) | mezclar, filtrar o enlazar registros ODbL con otros datos en una base que se **usa públicamente** | si `spec_values` mezcla valores S14 con EEA/RDW y la web consulta esa base, la base derivada (al menos la parte adaptada) debe ofrecerse bajo ODbL (§4.6: base o fichero de cambios) |
| *Produced Work* (§4.5–4.6) | una web, cálculo o gráfico **producido** desde la base | no hereda la ODbL, pero exige aviso y, si sale de una base derivada, ofrecer esa base derivada |
| *Collective Database* (§4.5 a) | la base ODbL junto a otras **independientes**, sin adaptarla | sin share-alike para las demás: solo si S14 queda en tablas/columnas separadas, no fusionado en el mismo valor |
| Keep open (§4.7) | restricciones técnicas solo si existe versión abierta paralela | cualquier exportación/API con datos S14 tendría que tener versión abierta |
| Contenidos | la ODbL cubre derechos sobre la base; el contenido individual no tiene licencia separada (no se cita DbCL) | los hechos aislados no tienen licencia explícita |

## 3. Compatibilidad con las fuentes actuales

| Uso en la arquitectura | EEA (CC BY 4.0) | RDW (CC0) | Traficom (CC BY 4.0) | gor3a (ODbL) |
|---|---|---|---|---|
| Bases separadas (raw/curación) | ✅ | ✅ | ✅ | ✅ si es independiente (colectiva) |
| Datos mezclados en `spec_values` | atribución | — | atribución | **share-alike**: la base derivada pasa a ODbL; CC BY y CC0 permiten relicenciar en ODbL con atribución |
| Base derivada (MySQL comercial) | — | — | — | publicar la base derivada (o el fichero de cambios) bajo ODbL si se usa públicamente |
| Resultados calculados (engines) | atribución | — | atribución | *Produced Work*: aviso + oferta de la base derivada si procede |
| Visualización pública | atribución | — | atribución | aviso ODbL |
| Exportación/API | CC BY | — | CC BY | ODbL obligatoria para los datos S14 |

Técnicamente son compatibles. El coste es abrir la parte derivada de la base, y eso choca con mantener la base MySQL como activo propietario. **No se cambia la arquitectura sin decisión documentada.**

## 4. Origen autoevolution

- autoevolution.com (marca de SoftNews NET S.R.L., Rumanía, según registros de marca) devolvió **HTTP 403** a la lectura directa de sus páginas de términos y copyright. No se eludió el bloqueo.
- Lo indexado por buscadores dice que la mayor parte del contenido es original del personal y está "protected by copyright laws", y que la reproducción sin permiso escrito está prohibida (evidencia indirecta, por verificar).
- Riesgo: derecho *sui generis* de la UE (Directiva 96/9/CE) sobre una extracción sustancial de su base de fichas. Una relicencia ODbL hecha por un tercero no lo neutraliza.

## 5. Opendatabay (S15)

- La página dice "CC0: Public Domain", pero el JSON-LD de la misma página enlaza la "General AI Training and Fine-Tuning Data License", que prohíbe el uso comercial y la redistribución.
- La procedencia original no está declarada (re-listado de un Kaggle "CC0" sin fuente). CC0 de quien no es titular no elimina derechos de terceros.
- **Bloqueado.**

## 6. Recomendación para revisión jurídica

1. **S14 = investigación** (estado actual): ❓ en la matriz; valores solo en `data/research/`, nunca en `spec_values` ni en la web.
2. Para cualquier uso productivo:
   - (a) confirmación escrita del autor de gor3a sobre la base legal de la compilación;
   - (b) permiso o licencia de SoftNews/autoevolution;
   - (c) decisión sobre share-alike: base separada (*colectiva*) frente a mezcla.
3. Alternativa de menor riesgo: usar S14 solo para **localizar** qué dato buscar en una fuente con derechos (fabricante, JATO), como km77 en D1.3.
4. No cambiar a PUBLIC_APPROVED ninguna fuente en D1.4.
