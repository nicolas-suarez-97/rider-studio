# Rider Studio · Base técnica para la IA

Versión **2026-10-20**, generada desde *Especificaciones técnicas para Rider Studio*.
El documento revisado por el equipo es la fuente; estos archivos son la versión que carga la IA de la página y el copiloto de Cursor.

## Archivos

| Archivo | Qué es | Cuándo se carga |
| :--- | :--- | :--- |
| `parte-1-sistema-de-pa-contexto-ia.md` | Sistema de PA, procesamiento y medición | Cuando el usuario trabaja el PA |
| `parte-2-consolas-contexto-ia.md` | Consola FOH, periféricos y monitores | Cuando trabaja consolas |
| `parte-3-personal-de-audio-contexto-ia.md` | Personal de audio: sistema, FOH y monitores | Cuando trabaja el personal |
| `parte-4-transporte-terrestre-contexto-ia.md` | Transporte terrestre (hospitalidad logística) | Cuando el usuario trabaja transporte / sección hospitality transporte / vans, transfers, runner, Parties vehiculares |
| `catalogo_json.json` | Las mismas familias en formato estructurado: datos con `id`, reglas con código y estado, tablas del catálogo y textos modelo | Consultas y validaciones desde el código |
| `RIDER_QUALITY_STANDARDS.md` | Estándar de calidad, anti-patrones y estructura obligatoria del rider | Siempre, junto con el catálogo |

Cada `.md` de parte es autosuficiente: papel de la IA, cómo trabajar, reglas generales, perfil del show y sus familias. Se usa como contexto de sistema.

## Convenciones

- Cada dato tiene un id `prefijo.nombre` (por ejemplo `foh.show_file_y_version`).
- Cada regla tiene un código `PREFIJO-número` (por ejemplo `FOH-6`).
- Las reglas marcadas **propuesta** todavía no las confirma el equipo y pueden cambiar.
- Las tablas de datos dicen qué debe dejar claro el rider; el porcentaje de llenado se mide contra los datos que aplican a cada show.

## Cómo lo consume el producto

Las reglas de calidad vigentes (`RIDER_QUALITY_STANDARDS.md`, red flags y hardware aprobado) se mantienen. El catálogo de familias las complementa.

`src/lib/standards` selecciona las familias relevantes del `catalogo_json.json` y las inyecta, junto con esas reglas, en:

- el chat (`/api/chat`) al redactar o sugerir cláusulas
- la auditoría (`/api/riders/review`) al proponer mejoras

No se vuelca el catálogo entero en cada turno: se recortan familias, tablas y marcas según la sección y el mensaje.

La hospitalidad logística terrestre (`transporte_terrestre`, parte 4) es una familia aparte del catálogo de audio. Se inyecta solo cuando el usuario trabaja transporte. No se mezcla con PA, consolas ni personal de audio.

## Todavía no está en este paquete

In-ears, monitores de piso, side fills y RF, con input list y output list; técnico de RF y microfonistas; posición de FOH y áreas de trabajo; glosario ampliado.

Vuelos (borrador EN DISCUSIÓN); hoteles; camerinos; catering; flota comercial.
