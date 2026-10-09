# Estándar Técnico de Calidad de Riders — Rider Studio

Este documento define el estándar oficial de calidad para la creación, estructuración y validación de **Riders Técnicos y de Producción** dentro del ecosistema de **Rider Studio**. Sirve como especificación técnica para ingenieros de producción, promotores y modelos de inteligencia artificial encargados de redactar o auditar riders.

---

## 1. Principios Fundamentales del Estándar

Un rider técnico profesional debe satisfacer tres funciones críticas:
1. **Manual de Ingeniería Preciso:** Guía inequívoca de instalación para los proveedores de audio, iluminación, video, escenario y acometida eléctrica.
2. **Anexo Contractual Vinculante:** Base jurídica que respalda al artista y a la producción en caso de incumplimiento técnico en el recinto.
3. **Insumo para Contra-Rider:** Documento estructurado con alternativas claras que permite al proveedor local proponer inventario equivalente de manera ágil y sin disputas.

---

## 2. Matriz Comparativa: Buen Rider vs. Mal Rider

| Dimensión | Rider de Calidad (Estándar Rider Studio) | Rider Deficiente / Mal Rider |
| :--- | :--- | :--- |
| **Definición de P.A.** | Criterio electroacústico: Nivel de presión sonora en punto de mezcla ($102\text{ dBA}$ cont. / $114\text{ dBC}$ peak con $12\text{ dB}$ de headroom), respuesta en frecuencia ($30\text{ Hz} - 18\text{ kHz}$) y cobertura homogénea ($\pm 3\text{ dB}$). | Criterio por potencia eléctrica ("15.000 Watts" o "20.000 Vatios"), el cual no garantiza cobertura, fidelidad ni rango dinámico. |
| **Marcas de Equipos** | Clasificación jerárquica con alternativas: Tier 1 (Preferencia), Tier 2 (Alternativa homologada) y Blacklist (No aceptados). | Exigencia inflexible de una única marca/modelo exótico o vaguedad absoluta ("Consola profesional de buena marca"). |
| **Input List (Parche)** | Matriz tabular completa: Canal #, Fuente/Instrumento, Transductor primario, Transductor alternativo, Tipo de atril, Phantom (+48V) y Asignación de manguera. | Lista simple de texto sin modelos de micrófonos, sin especificación de cajas directas activas/pasivas ni requerimientos de soportes. |
| **Monitoreo y RF** | Matriz de mezclas (IEM/Cuñas), formato mono/estéreo, hardware de transmisión, rangos de frecuencia RF y obligatoriedad de escaneo espectral. | "Monitores para la banda" sin especificar mezclas auxiliares, modelos de IEM ni marcas de microfonía inalámbrica. |
| **Stage Plot** | Diagrama acotado en metros/pies, distribución de músicos, medidas de tarimas elevadas (risers) y acometidas de corriente AC. | Boceto a mano alzada sin cotas, sin orientación ni especificación de risers, o ausencia total de plano. |
| **Infraestructura Eléctrica** | Distribución de tomas AC por posición, voltaje especificado (110V/220V) y exigencia de **tierra aislada dedicada exclusivamente para audio**. | No se menciona la corriente o solo se pide "una extensión en tarima", generando zumbidos y bucles de masa (ground loops). |
| **Modularidad** | Separación limpia por áreas: Audio FOH, Monitoreo, Backline, Iluminación, Video, Rigging y Electricidad. Hospitalidad en documento independiente. | Rider técnico contaminado con requerimientos de toallas, catering, botellas de licor o peticiones personales de camerino. |
| **Gobernanza** | Versión, fecha de revisión, contactos directos (FOH, Monitores, Iluminación, PM) con teléfono/email y plazo límite para contra-rider (SLA). | Documento anónimo o desactualizado, sin versión, sin fecha y sin contactos directos de los responsables técnicos. |

---

## 3. Estructura Obligatoria de un Rider Técnico

Todo rider generado o validado por Rider Studio debe contener las siguientes secciones ordenadas:

### 3.1 Encabezado y Metadatos de Producción
* Nombre del proyecto, gira y formato (Full Band, Acústico, Festival, Fly Rig).
* Versión del documento y fecha de emisión (ej. `v3.1 — 2026`).
* Directorio de contactos técnicos con rol, nombre, teléfono móvil/WhatsApp, correo electrónico y zona horaria.
* Plazo contractual de revisión de contra-rider (SLA recomendado: mínimo 15 días hábiles antes del evento).

### 3.2 Sistema Principal de Sonido (P.A. & Subwoofers)
* Sistema Line Array estéreo profesional con cobertura física de 100% de la audiencia.
* Subwoofers configurados en arreglo de gradiente o cardioide para control de dispersión hacia el escenario.
* Front-fills y out-fills para recintos con abanico amplio o zonas ciegas.
* Obligatoriedad de presencia de un Ingeniero de Sistemas calificado por el fabricante del sistema durante alineación y show.

### 3.3 Control de Sala (FOH)
* Ubicación de la cabina de control: Centrada horizontalmente respecto al escenario, a nivel de piso de audiencia (nunca elevada sobre andamios ni bajo voladizos).
* Consolas principales homologadas y consolas alternativas (ej. DiGiCo Quantum/SD-Series, Avid S6L, Yamaha Rivage/CL).
* Protocolos de conexión de escenario a FOH (Dante, MADI, líneas de red Cat6e blindadas etherCON).

### 3.4 Monitoreo y Radiofrecuencia (RF)
* Consola de monitores dedicada con split pasivo aislado por transformador (evita fallos de masa compartida).
* Canales de monitoreo In-Ear (IEM) estéreo con receptores diversity.
* Cuñas de piso (wedges) bi-amplificadas de 12" o 15" y subwoofers para baterista (drum fill).
* Protocolo de coordinación de frecuencias: Todo equipo inalámbrico debe ser coordinado in-situ previa prueba de sonido.

### 3.5 Input List & Patch de Escenario
Estructura de tabla indispensable:
1. **Ch:** Número de canal físico en pachera/stage box.
2. **Fuente:** Instrumento o voz específico (ej. "Bombo In", "Bajo Eléctrico", "Voz Principal").
3. **Transductor Principal:** Micrófono o caja directa requerida (ej. Shure Beta 91A, Radial J48).
4. **Transductor Alternativo:** Opción secundaria admisible (ej. Audix D6, BSS AR-133).
5. **Atril / Soporte:** Corto con jirafa, alto con jirafa, base pesada redonda, clip o pinza de aro.
6. **Phantom Power (+48V):** Indicador explícito Si / No.
7. **Notas / Posición:** Asignación en sub-snake o procesador externo.

### 3.6 Backline e Instrumentación
* Especificaciones de batería: Medidas de bombo, toms, caja y herrajes (marcas preferidas: DW, Pearl Masters, Ludwig, Yamaha).
* Amplificadores de bajo: Cabezales y cajas (ej. Ampeg SVT-CL + 8x10, Aguilar).
* Amplificadores de guitarra: Modelos valvulares específicos (Fender Twin Reverb, Vox AC30, Marshall JCM) con voltajes compatibles.
* Teclados y accesorios: Soportes de doble tijera reforzados, fuentes de alimentación y cables de enlace.

### 3.7 Stage Plot e Infraestructura de Tarima
* Medidas mínimas de tarima libre de obstáculos (ancho, fondo, altura).
* Dimensiones y alturas de tarimas móviles (risers) con ruedas y frenos de seguridad.
* Distribución física de los músicos y líneas de vista con el director musical / ingeniero.
* Cuadro de acometidas eléctricas (AC Drops) con indicación de voltaje, amperaje y toma a tierra aislada.

### 3.8 Iluminación, Video y Efectos Especiales (SFX)
* Consola de iluminación requerida (GrandMA3, ChamSys, Avolites).
* Tabla de luminarias por tipo (Spot, Beam, Wash, Strobes LED, Cegadoras).
* Requerimientos de pantalla LED de fondo (dimensiones, pitch milimétrico, procesador NovaStar/Brompton).
* Requerimientos de máquinas de niebla (hazer) base agua (no aceite) compatibles con sistemas de alarma de humo.

---

## 4. Catálogo de Anti-Patrones y Prácticas Prohibidas

Para que un LLM audite o genere riders de forma impecable, debe detectar y evitar activamente las siguientes prácticas:

1. **El Síndrome de los Vatios (Watt Trap):** Nunca expresar requerimientos de sonorización en Watts. Utilizar siempre métricas de SPL y modelos de sistemas line array reconocidos.
2. **Contaminación de Hospitalidad:** Mantener el documento 100% técnico. No incluir listas de alimentos, toallas, alcohol ni hospedaje en el rider técnico.
3. **Inconsistencias Internas:** Asegurar que el número de canales del Input List coincida con el Stage Plot y que las consolas solicitadas tengan capacidad de procesar todas las entradas y mezclas auxiliares.
4. **Inflexibilidad Extrema sin Alternativas:** No listar piezas de equipamiento únicas sin proveer 1 o 2 sustitutos industriales homologados.
5. **Descripciones Genéricas:** Eliminar frases ambiguas como "sistema adecuado", "buena potencia" o "luces de calidad", reemplazándolas por marcas, referencias y estándares cuantitativos.
