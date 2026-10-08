export interface SectionFieldDef {
  key: string;
  label: string;
  placeholder: string;
  prefix: string;
}

export interface SectionConfig {
  sectionTitleHint: string;
  fields: SectionFieldDef[];
}

export const SECTION_FIELD_CONFIGS: Record<string, SectionConfig> = {
  // --- TÉCNICO ---
  'tech-contactos': {
    sectionTitleHint: 'Contactos y Producción General',
    fields: [
      { key: 'artista', label: 'Artista o Banda', placeholder: 'ej. The Sound Wave Live Band', prefix: 'Artista / Banda' },
      { key: 'management', label: 'Management / Producción Ejecutiva', placeholder: 'Nombre / Teléfono / Email', prefix: 'Management / Producción Ejecutiva' },
      { key: 'foh', label: 'Ingeniero FOH / Sonido de Sala', placeholder: 'Nombre / Teléfono / Email', prefix: 'Ingeniero FOH / Sonido de Sala' },
      { key: 'monitores', label: 'Ingeniero de Monitores', placeholder: 'Nombre / Teléfono / Email', prefix: 'Ingeniero de Monitores' },
      { key: 'stagemanager', label: 'Stage Manager / Jefe de Escenario', placeholder: 'Nombre / Teléfono / Email', prefix: 'Stage Manager / Jefe de Escenario' },
      { key: 'venue_fecha', label: 'Fecha y Recinto (Venue)', placeholder: 'ej. Movistar Arena, Bogotá - 15 Noviembre', prefix: 'Fecha y Venue del Evento' }
    ]
  },
  'tech-pa': {
    sectionTitleHint: 'Sistema de PA & Consola de Sala',
    fields: [
      { key: 'criterio_pa', label: 'Criterio PA / Marcas Aceptadas', placeholder: 'ej. L-Acoustics K2 / d&b audiotechnik GSL / Meyer Sound Panther', prefix: 'Criterio PA' },
      { key: 'spl', label: 'Cobertura & SPL Requerido', placeholder: 'ej. Mínimo 110 dBA SPL continuo sin distorsión en todo el recinto', prefix: 'Cobertura' },
      { key: 'consola_foh', label: 'Consola FOH Preferida', placeholder: 'ej. DiGiCo Quantum 338 / Avid S6L 24C / Yamaha Rivage PM5', prefix: 'Consola FOH preferida' },
      { key: 'conectividad', label: 'Conectividad & Splitter', placeholder: 'ej. Manguera Cat6e blindada FOH-Escenario, split pasivo aislado por transformadores', prefix: 'Conectividad' }
    ]
  },
  'tech-monitores': {
    sectionTitleHint: 'Monitoreo, In-Ears & Tarima',
    fields: [
      { key: 'iem', label: 'In-Ear Monitors (IEM) Inalámbricos', placeholder: 'ej. 8 canales estéreo Shure PSM1000 / Sennheiser G4 con combinador y antena helicoidal', prefix: 'Sistema de IEM (In-Ear Monitors)' },
      { key: 'monitores_piso', label: 'Monitores de Piso / Cuñas', placeholder: 'ej. 6 cuñas bi-amplificadas de 15" d&b M4 o L-Acoustics X15', prefix: 'Monitores de Piso' },
      { key: 'sidefills', label: 'Side Fills & Drum Fill', placeholder: 'ej. Subwoofer 18" + satélite para batería; 2x side fills estéreo en laterales', prefix: 'Side fills y Drum fill' },
      { key: 'consola_mon', label: 'Consola de Monitores Dedicada', placeholder: 'ej. DiGiCo SD12 con 48 entradas y switch de talkback independiente', prefix: 'Consola de Monitores' }
    ]
  },
  'tech-backline': {
    sectionTitleHint: 'Instrumentos & Amplificación',
    fields: [
      { key: 'bateria', label: 'Batería Requerida', placeholder: 'ej. DW Collector\'s / Yamaha Recording (Bombo 22", Toms 10", 12", 16", parches Remo)', prefix: 'Batería' },
      { key: 'bajo', label: 'Bajo & Gabinete', placeholder: 'ej. Cabezal Ampeg SVT-CL valvular + Gabinete Ampeg 8x10" Heritage', prefix: 'Bajo' },
      { key: 'guitarras', label: 'Guitarras & Amplificadores', placeholder: 'ej. 1x Fender Twin Reverb 65 + 1x Marshall JCM900 con footswitch', prefix: 'Guitarras' },
      { key: 'teclados', label: 'Teclados & Sintetizadores', placeholder: 'ej. Nord Stage 3 88 teclas, soporte Spider doble X, 4x cajas DI activas', prefix: 'Teclados' }
    ]
  },
  'tech-inputlist': {
    sectionTitleHint: 'Input List & Patch de Escenario',
    fields: [
      { key: 'microfonia', label: 'Criterio General de Microfonía', placeholder: 'ej. Shure, Sennheiser, Neumann, AKG. Cajas DI activas Radial J48 / BSS', prefix: 'Criterio de Microfonía' },
      { key: 'parche', label: 'Parche de Pachera & Sub-snakes', placeholder: 'ej. 4x Sub-snakes distribuidos (Batería, Centro, Stage Left, Stage Right)', prefix: 'Sub-snakes' },
      { key: 'phantom', label: 'Alimentación Phantom & Inalámbricos', placeholder: 'ej. Phantom +48V individual por canal; coordinación de frecuencias RF', prefix: 'Alimentación & RF' }
    ]
  },
  'tech-stageplot': {
    sectionTitleHint: 'Tarima, Risers & Electricidad',
    fields: [
      { key: 'tarima', label: 'Dimensiones Mínimas de Tarima', placeholder: 'ej. 14m ancho x 10m fondo x 1.60m alto libre de obstáculos', prefix: 'Dimensiones mínimas de tarima' },
      { key: 'risers', label: 'Risers (Tarimas Elevadas)', placeholder: 'ej. 1x Tarima 2.40m x 2.40m x 0.40m con freno y alfombra negra para batería', prefix: 'Risers' },
      { key: 'distribucion', label: 'Distribución Espacial', placeholder: 'ej. Batería centro-fondo, Bajo stage left, Guitarras stage right, Voz frente', prefix: 'Distribución espacial' },
      { key: 'corriente', label: 'Tomas de Corriente Eléctrica (AC)', placeholder: 'ej. 6 puntos regulados de 110V/220V 20A aterrizados aislados por posición', prefix: 'Puntos de corriente eléctrica' }
    ]
  },
  'tech-iluminacion': {
    sectionTitleHint: 'Luces, Pantalla LED & Efectos',
    fields: [
      { key: 'consola_luces', label: 'Consola de Control de Luces', placeholder: 'ej. GrandMA3 Full Size o GrandMA2 con universo sACN/Art-Net', prefix: 'Consola de control de luces' },
      { key: 'luminarias', label: 'Luminarias Mínimas Requeridas', placeholder: 'ej. 16x Spot 700W, 12x Beam, 16x Wash LED, 8x Cegadoras incandescentes', prefix: 'Tipos de luminarias mínimas' },
      { key: 'pantalla_led', label: 'Pantalla LED de Fondo', placeholder: 'ej. Pantalla LED 12m x 6m pitch P3.9 con procesador Novastar 4K', prefix: 'Pantalla LED de fondo' },
      { key: 'efectos', label: 'Máquinas de Efectos & Humo', placeholder: 'ej. 2x Máquinas de niebla profesional base agua (Hazer) para lectura de haces', prefix: 'Máquinas de niebla o humo' }
    ]
  },

  // --- HOSPITALITY ---
  'hosp-camerinos': {
    sectionTitleHint: 'Camerinos & Acondicionamiento',
    fields: [
      { key: 'principal', label: 'Camerino Principal (Artista)', placeholder: 'ej. Baño privado con ducha, A/C a 21°C, sofá cómodo, espejo de cuerpo entero con luz cálida', prefix: 'Camerino Principal' },
      { key: 'banda', label: 'Camerino de Banda / Músicos', placeholder: 'ej. Capacidad para 6 personas, percheros con ganchos, toallas limpias, asientos', prefix: 'Camerino de Músicos / Banda' },
      { key: 'crew', label: 'Camerino de Crew / Producción', placeholder: 'ej. Mesa de trabajo, tomas eléctricas, Wi-Fi de alta velocidad para producción', prefix: 'Camerino de Crew / Producción' }
    ]
  },
  'hosp-catering': {
    sectionTitleHint: 'Catering, Menú & Dietas',
    fields: [
      { key: 'pax', label: 'Total de Raciones (PAX)', placeholder: 'ej. 14 PAX para almuerzo caliente y 14 PAX para cena post-show', prefix: 'Número total de raciones (PAX)' },
      { key: 'horarios', label: 'Horarios de Servicio de Comida', placeholder: 'ej. Almuerzo a las 13:30, Merienda/Snacks a las 17:00, Cena a las 21:00', prefix: 'Horarios requeridos de servicio' },
      { key: 'dietas', label: 'Dietas Especiales & Alergias', placeholder: 'ej. 2x Opciones vegetarianas, 1x Vegano, 1x Celíaco estricto (sin gluten)', prefix: 'Restricciones alimentarias' },
      { key: 'vajilla', label: 'Vajilla & Sustentabilidad', placeholder: 'ej. Vajilla de cerámica y cubiertos metálicos (prohibido plástico de un solo uso)', prefix: 'Vajilla y servicio' }
    ]
  },
  'hosp-bebidas': {
    sectionTitleHint: 'Hidratación & Cuidado Vocal',
    fields: [
      { key: 'agua', label: 'Agua Mineral', placeholder: 'ej. 24 botellas 500ml sin gas (12 al clima + 12 frías en nevera)', prefix: 'Agua mineral sin gas' },
      { key: 'cafe', label: 'Estación de Café & Bebidas Calientes', placeholder: 'ej. Cafetera espresso, café de grano, leche vegetal (avena/almendra), miel', prefix: 'Estación de café' },
      { key: 'vocal', label: 'Cuidado Vocal del Artista', placeholder: 'ej. Jengibre fresco cortado, limones orgánicos, miel pura y té de manzanilla', prefix: 'Cuidado vocal' },
      { key: 'escenario', label: 'Bebidas & Toallas para Tarima', placeholder: 'ej. 12 botellas pequeñas sin gas y 6 toallas negras limpias en tarima', prefix: 'Bebidas para escenario' }
    ]
  },
  'hosp-hotel': {
    sectionTitleHint: 'Hotelería & Alojamiento',
    fields: [
      { key: 'categoria', label: 'Categoría & Ubicación del Hotel', placeholder: 'ej. Hotel 5 estrellas o Boutique Superior a menos de 20 min del recinto', prefix: 'Categoría de hotel requerida' },
      { key: 'habitaciones', label: 'Distribución de Habitaciones', placeholder: 'ej. 1 Master Suite para artista + 6 habitaciones dobles estándar para banda y crew', prefix: 'Distribución' },
      { key: 'condiciones', label: 'Condiciones de Estadía', placeholder: 'ej. Desayuno buffet incluido, Wi-Fi de alta velocidad, Late Check-out a las 16:00', prefix: 'Condiciones' }
    ]
  },
  'hosp-transporte': {
    sectionTitleHint: 'Transporte Local & Logística',
    fields: [
      { key: 'vehiculos', label: 'Tipo de Vehículos', placeholder: 'ej. 2 Camionetas ejecutivas tipo Van (Mercedes Sprinter) con A/C y vidrios polarizados', prefix: 'Tipo de vehículos requeridos' },
      { key: 'chofer', label: 'Chofer & Disponibilidad', placeholder: 'ej. Choferes profesionales bilingües a disposición exclusiva 24/7', prefix: 'Chofer profesional' },
      { key: 'itinerario', label: 'Rutas e Itinerarios', placeholder: 'ej. Aeropuerto ↔ Hotel ↔ Recinto del evento ↔ Retorno al aeropuerto', prefix: 'Itinerario de rutas' }
    ]
  },

  // --- SEGURIDAD ---
  'seg-perimetro': {
    sectionTitleHint: 'Perímetro & Control de Accesos',
    fields: [
      { key: 'accesos', label: 'Control en Puertas y Carga', placeholder: 'ej. Control estricto en puertas principales, accesos vehiculares y muelles de carga', prefix: 'Control estricto de acceso' },
      { key: 'filtros', label: 'Filtros con Detectores de Metal', placeholder: 'ej. Pórticos detectores de metales, cacheo superficial reglamentario de bolsos', prefix: 'Filtros de seguridad' },
      { key: 'acreditacion', label: 'Acreditaciones & Pulseras', placeholder: 'ej. Sistema de pulseras holográficas por zonas (All Access, Backstage, Escenario)', prefix: 'Sistema de acreditación' },
      { key: 'prohibidos', label: 'Objetos Prohibidos al Público', placeholder: 'ej. Prohibido ingreso de envases de vidrio, armas, pirotecnia u objetos cortopunzantes', prefix: 'Política de objetos prohibidos' }
    ]
  },
  'seg-foso': {
    sectionTitleHint: 'Vallas Mojo & Foso de Prensa (Pit)',
    fields: [
      { key: 'vallas', label: 'Vallas de Contención Mojo', placeholder: 'ej. Vallas antipánico de aluminio certificadas tipo Mojo Barriers frente a tarima', prefix: 'Vallas de contención antipánico' },
      { key: 'distancia', label: 'Distancia Escenario - Vallas', placeholder: 'ej. Distancia mínima requerida de 1.80 metros frente a la primera línea de tarima', prefix: 'Distancia mínima requerida' },
      { key: 'extraccion', label: 'Pasillo de Extracción & Guardias', placeholder: 'ej. Pasillo central despejado para extracción médica y guardias cada 2 metros', prefix: 'Pasillo central libre' },
      { key: 'prensa', label: 'Protocolo de Fotógrafos & Prensa', placeholder: 'ej. Primeras 3 canciones sin flash en foso pit para prensa autorizada', prefix: 'Protocolo para fotógrafos' }
    ]
  },
  'seg-custodia': {
    sectionTitleHint: 'Custodia del Artista & Backstage Estéril',
    fields: [
      { key: 'agentes', label: 'Agentes de Custodia Personal', placeholder: 'ej. 2 agentes de seguridad privada asignados permanentemente al artista', prefix: 'Agentes de custodia privada' },
      { key: 'pasillo', label: 'Perímetro Estéril de Camerinos', placeholder: 'ej. Pasillo de camerinos como zona estéril con control estricto de puerta', prefix: 'Pasillo de camerinos' },
      { key: 'ruta', label: 'Ruta Segura a Escenario', placeholder: 'ej. Corredor seguro y despejado desde camerino hasta tarima', prefix: 'Ruta de acceso rápido' },
      { key: 'acceso', label: 'Restricción de Acceso', placeholder: 'ej. Prohibición absoluta de personal sin pulsera All Access en área de descanso', prefix: 'Prohibición absoluta' }
    ]
  },
  'seg-emergencias': {
    sectionTitleHint: 'Unidad Médica, Evacuación & Aforo',
    fields: [
      { key: 'ambulancia', label: 'Ambulancia Medicalizada', placeholder: 'ej. Ambulancia de soporte vital avanzado en punto fijo detrás de tarima', prefix: 'Ambulancia de soporte vital' },
      { key: 'paramedicos', label: 'Personal Paramédico', placeholder: 'ej. 2 paramédicos equipados con desfibrilador durante montaje, show y desmontaje', prefix: 'Personal paramédico' },
      { key: 'evacuacion', label: 'Rutas de Evacuación & Hospital', placeholder: 'ej. Salidas de emergencia despejadas y ruta rápida coordinada con hospital local', prefix: 'Plan de evacuación' },
      { key: 'extintores', label: 'Extintores en Escenario', placeholder: 'ej. 4 extintores de CO2 de 5kg en esquinas de tarima y cabina FOH', prefix: 'Extintores de CO2' }
    ]
  }
};
