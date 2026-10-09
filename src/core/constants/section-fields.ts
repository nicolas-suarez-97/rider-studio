export interface SectionFieldDef {
  key: string;
  label: string;
  placeholder: string;
  prefix: string;
  chips?: string[];
}

export interface SectionConfig {
  sectionTitleHint: string;
  fields: SectionFieldDef[];
}

export const SECTION_FIELD_CONFIGS: Record<string, SectionConfig> = {
  // ==========================================
  // --- TÉCNICO ---
  // ==========================================
  'tech-contactos': {
    sectionTitleHint: 'Contactos y Producción General',
    fields: [
      { key: 'artista', label: 'Artista o Banda', placeholder: 'ej. The Sound Wave Live Band', prefix: 'Artista / Banda' },
      { key: 'management', label: 'Management / Producción Ejecutiva', placeholder: 'Nombre / Teléfono / Email', prefix: 'Management / Producción Ejecutiva' },
      { key: 'foh', label: 'Ingeniero FOH / Sonido de Sala', placeholder: 'Nombre / Teléfono / Email', prefix: 'Ingeniero FOH / Sonido de Sala' },
      { key: 'monitores', label: 'Ingeniero de Monitores', placeholder: 'Nombre / Teléfono / Email', prefix: 'Ingeniero de Monitores' },
      { key: 'ld_video', label: 'Diseñador de Iluminación (LD) / Video', placeholder: 'Nombre / Teléfono / Email', prefix: 'Diseñador de Iluminación (LD) / Video' },
      { key: 'stagemanager', label: 'Stage Manager / Jefe de Escenario', placeholder: 'Nombre / Teléfono / Email', prefix: 'Stage Manager / Jefe de Escenario' },
      { key: 'venue_fecha', label: 'Fecha y Recinto (Venue)', placeholder: 'ej. Movistar Arena, Bogotá - 15 Noviembre', prefix: 'Fecha y Venue del Evento' }
    ]
  },
  'tech-pa': {
    sectionTitleHint: 'Sistema de PA & Consola de Sala',
    fields: [
      {
        key: 'criterio_pa',
        label: 'Criterio PA / Line Array Homologado',
        placeholder: 'Preferencia Tier 1 y Tier 2 aceptadas',
        prefix: 'Criterio PA',
        chips: ['L-Acoustics K1/K2', 'd&b audiotechnik GSL/KSL', 'Meyer Sound Panther', 'JBL VTX A12', 'Adamson E15']
      },
      {
        key: 'spl',
        label: 'Cobertura & SPL Requerido (FOH)',
        placeholder: 'ej. 102 dBA continuo / 114 dBC pico en FOH con 10-12 dB headroom (+/-3dB cobertura)',
        prefix: 'Cobertura & SPL',
        chips: ['102 dBA cont / 114 dBC peak (Estándar)', '105 dBA cont (Festival)', 'Uniformidad +/-3dB', '12 dB Headroom']
      },
      {
        key: 'system_tech',
        label: 'Ingeniero de Sistemas del Fabricante',
        placeholder: 'ej. Requerido técnico de sistemas certificado por el fabricante presente en alineación y show',
        prefix: 'Ingeniero de Sistemas',
        chips: ['Obligatorio certificado por fábrica', 'Presente desde ajuste inicial y todo el show']
      },
      {
        key: 'consola_foh',
        label: 'Consola FOH Preferida y Alternativa',
        placeholder: 'ej. Tier 1: DiGiCo Quantum 338 / Avid S6L. Tier 2: DiGiCo SD12 / Yamaha CL5',
        prefix: 'Consola FOH preferida',
        chips: ['DiGiCo Quantum 338', 'DiGiCo SD12', 'Avid S6L 24C', 'Yamaha Rivage PM5', 'Yamaha CL5']
      },
      {
        key: 'conectividad',
        label: 'Conectividad & Redes Digitales',
        placeholder: 'ej. Manguera Cat6e blindada etherCON, protocolo Dante/MADI redundante, split pasivo',
        prefix: 'Conectividad',
        chips: ['Líneas Cat6e blindadas etherCON', 'Split pasivo aislado por transformador', 'Dante Redundante']
      }
    ]
  },
  'tech-monitores': {
    sectionTitleHint: 'Monitoreo, In-Ears & Radiofrecuencia (RF)',
    fields: [
      {
        key: 'iem',
        label: 'In-Ear Monitors (IEM) Inalámbricos',
        placeholder: 'ej. 8 canales estéreo Shure PSM1000 con combinador de antena y antenas helicoidales',
        prefix: 'Sistema de IEM (In-Ear Monitors)',
        chips: ['Shure PSM1000 estéreo', 'Sennheiser 2000 Series', 'Sennheiser ew G4 IEM', 'Combinador activo Shure PA805']
      },
      {
        key: 'rf_coord',
        label: 'Coordinación de Radiofrecuencia (RF)',
        placeholder: 'ej. Escaneo espectral in-situ obligatorio con Wireless Workbench previa prueba de sonido',
        prefix: 'Coordinación de RF',
        chips: ['Escaneo espectral obligatorio in-situ', 'Shure Wireless Workbench', 'Línea de vista directa a escenario']
      },
      {
        key: 'monitores_piso',
        label: 'Monitores de Piso / Cuñas',
        placeholder: 'ej. 6 cuñas bi-amplificadas de 15" d&b M4 o L-Acoustics X15',
        prefix: 'Monitores de Piso',
        chips: ['d&b audiotechnik M4 (15")', 'L-Acoustics X15 HiQ', '6 mezclas independientes']
      },
      {
        key: 'sidefills',
        label: 'Side Fills & Drum Fill',
        placeholder: 'ej. Subwoofer 18" + satélite para batería; 2x side fills estéreo en laterales',
        prefix: 'Side fills y Drum fill',
        chips: ['Sub 18" + Top para Drum fill', '2x Side Fills estéreo laterales d&b/L-Acoustics']
      },
      {
        key: 'consola_mon',
        label: 'Consola de Monitores Dedicada',
        placeholder: 'ej. DiGiCo SD12 con 48 entradas y split galvánico pasivo',
        prefix: 'Consola de Monitores',
        chips: ['DiGiCo SD12 (Consola dedicada)', 'DiGiCo Quantum 225', 'Yamaha CL5 dedicada']
      }
    ]
  },
  'tech-backline': {
    sectionTitleHint: 'Instrumentos, Amplificación & Voltajes',
    fields: [
      {
        key: 'bateria',
        label: 'Batería Requerida & Accesorios',
        placeholder: 'ej. DW Collector\'s / Yamaha Recording (22", 10", 12", 16"), alfombra antideslizante',
        prefix: 'Batería',
        chips: ['DW Collector\'s Series', 'Yamaha Recording Custom', 'Pearl Masters', 'Alfombra antideslizante obligatoria']
      },
      {
        key: 'bajo',
        label: 'Bajo & Gabinete',
        placeholder: 'ej. Cabezal Ampeg SVT-CL valvular + Gabinete Ampeg 8x10" Heritage',
        prefix: 'Bajo',
        chips: ['Ampeg SVT-CL + 8x10" Heritage', 'Aguilar DB751 + 4x10"', 'Genzler Magellan']
      },
      {
        key: 'guitarras',
        label: 'Guitarras & Amplificadores',
        placeholder: 'ej. 1x Fender Twin Reverb 65 + 1x Marshall JCM900 con footswitch y transformador',
        prefix: 'Guitarras',
        chips: ['Fender Twin Reverb 65', 'Vox AC30 Handwired', 'Marshall JCM900 con footswitch', 'Transformador 110V/220V']
      },
      {
        key: 'teclados',
        label: 'Teclados & Sintetizadores',
        placeholder: 'ej. Nord Stage 3 88 teclas, soporte reforzado Spider Pro, 4x cajas DI activas',
        prefix: 'Teclados',
        chips: ['Nord Stage 3 (88 teclas)', 'Korg Kronos 2', 'Soporte Spider Pro doble X', 'Cajas DI activas Radial J48']
      }
    ]
  },
  'tech-inputlist': {
    sectionTitleHint: 'Input List & Patch de Escenario',
    fields: [
      {
        key: 'microfonia',
        label: 'Criterio General de Microfonía',
        placeholder: 'ej. Shure, Sennheiser, Neumann, AKG, DPA. Cajas DI activas Radial J48 / BSS',
        prefix: 'Criterio de Microfonía',
        chips: ['Shure / Sennheiser / DPA', 'Cajas DI Radial J48 activas', 'Neumann KM184 para acústicos']
      },
      {
        key: 'parche',
        label: 'Parche de Pachera & Sub-snakes',
        placeholder: 'ej. 4x Sub-snakes distribuidos (Batería, Centro, Stage Left, Stage Right)',
        prefix: 'Sub-snakes',
        chips: ['4 sub-snakes en tarima (Drums, Center, SL, SR)', 'Pachera multipin rápida']
      },
      {
        key: 'phantom',
        label: 'Alimentación Phantom & Inalámbricos',
        placeholder: 'ej. Phantom +48V individual por canal; coordinación de frecuencias RF',
        prefix: 'Alimentación & RF',
        chips: ['Phantom +48V individual', 'Cápsulas Shure KSM9 / SM58 inalámbricas']
      }
    ]
  },
  'tech-stageplot': {
    sectionTitleHint: 'Tarima, Risers & Acometida Eléctrica',
    fields: [
      {
        key: 'tarima',
        label: 'Dimensiones Mínimas de Tarima',
        placeholder: 'ej. 14m ancho x 10m fondo x 1.60m alto libre de obstáculos',
        prefix: 'Dimensiones mínimas de tarima',
        chips: ['14m x 10m x 1.60m (Festival)', '12m x 8m x 1.20m (Teatro)', '10m x 6m x 1.00m (Club)']
      },
      {
        key: 'risers',
        label: 'Risers (Tarimas Elevadas con Ruedas)',
        placeholder: 'ej. 1x Tarima 2.40m x 2.40m x 0.40m con freno y alfombra negra para batería',
        prefix: 'Risers',
        chips: ['Batería: 2.40m x 2.40m x 0.40m con freno', 'Percusión: 2.00m x 2.00m x 0.40m', 'Faldón negro perimetral']
      },
      {
        key: 'distribucion',
        label: 'Distribución Espacial de Músicos',
        placeholder: 'ej. Batería centro-fondo, Bajo stage left, Guitarras stage right, Voz frente centro',
        prefix: 'Distribución espacial',
        chips: ['Batería centro-fondo', 'Bajo Stage Left', 'Guitarra Stage Right', 'Voz Centro-Frente']
      },
      {
        key: 'corriente',
        label: 'Acometida Eléctrica & Tierra Aislada',
        placeholder: 'ej. Puntos 20A 110V/220V con TIERRA FÍSICA AISLADA DEDICADA EXCLUSIVAMENTE PARA AUDIO',
        prefix: 'Puntos de corriente (AC Drops)',
        chips: ['Tierra física aislada para audio (Technical Earth)', 'Acometida 20A independiente', 'Conector PowerCON TRUE1']
      }
    ]
  },
  'tech-iluminacion': {
    sectionTitleHint: 'Iluminación, Pantallas LED & Visuales',
    fields: [
      {
        key: 'consola_luces',
        label: 'Consola de Control de Luces',
        placeholder: 'ej. GrandMA3 Full Size o ChamSys MQ500 con universos sACN/Art-Net',
        prefix: 'Consola de control de luces',
        chips: ['GrandMA3 Full Size', 'GrandMA2 Light', 'ChamSys MQ500', 'Avolites Diamond 9']
      },
      {
        key: 'luminarias',
        label: 'Luminarias Mínimas Requeridas',
        placeholder: 'ej. 16x Spot 700W, 12x Beam, 16x Wash LED, 8x Cegadoras incandescentes',
        prefix: 'Luminarias mínimas',
        chips: ['16x Spot LED + 12x Beam + 16x Wash', 'Robe Pointe / MegaPointe', 'Martin MAC Quantum']
      },
      {
        key: 'pantalla_led',
        label: 'Pantalla LED de Fondo & Procesador',
        placeholder: 'ej. Pantalla LED 12m x 6m pitch P3.9 con tasa 3840Hz y procesador Brompton/NovaStar',
        prefix: 'Pantalla LED de fondo',
        chips: ['Pitch P3.9 o menor', 'Tasa de refresco 3840Hz (Sin flicker)', 'Procesador Brompton Tessera', 'NovaStar 4K']
      },
      {
        key: 'efectos',
        label: 'Máquinas de Efectos & Niebla (Base Agua)',
        placeholder: 'ej. 2x Máquinas de niebla profesional base agua (Hazer). Prohibido base aceite',
        prefix: 'Máquinas de niebla',
        chips: ['Exclusivamente niebla base agua (Hazer)', 'Prohibido niebla base aceite', 'Ventiladores DMX orientables']
      }
    ]
  },
  'tech-rigging': {
    sectionTitleHint: 'Rigging, Cargas & Puntos de Cuelgue',
    fields: [
      {
        key: 'puntos_pa',
        label: 'Puntos de Cuelgue de PA (Motores)',
        placeholder: 'ej. 2x Puntos de 2 toneladas para Main PA + 2x Puntos de 1 tonelada para Subwoofers volados',
        prefix: 'Puntos de cuelgue de PA',
        chips: ['2x Puntos de 2 Toneladas (Main Hang)', '2x Puntos de 1 Tonelada (Subs/Fills)', 'Motores CM Lodestar 1T/2T']
      },
      {
        key: 'truss_luces',
        label: 'Puentes de Iluminación y Video',
        placeholder: 'ej. Puentes Frontal, Contra y Central en truss de aluminio de 40x40cm certificado',
        prefix: 'Puntos de rigging de iluminación',
        chips: ['Truss 40x40cm Prolyte/Eurotruss', 'Puente frontal + Puente contra + Calles']
      },
      {
        key: 'rigger',
        label: 'Rigger Profesional Certificado',
        placeholder: 'ej. Presencia obligatoria de rigger profesional certificado para verificar cálculo de cargas',
        prefix: 'Rigger certificado',
        chips: ['Rigger certificado obligatorio in-situ', 'Inspección de grilletes y eslingas']
      }
    ]
  },
  'tech-terminos': {
    sectionTitleHint: 'Condiciones Contractuales & Contra-Rider',
    fields: [
      {
        key: 'sla_contra',
        label: 'Plazo Límite de Envío de Contra-Rider',
        placeholder: 'ej. Todo contra-rider o propuesta de sustitución debe enviarse con mínimo 15 días hábiles',
        prefix: 'Plazo de Contra-Rider',
        chips: ['Mínimo 15 días hábiles antes del evento', 'Mínimo 30 días hábiles (Giras internacionales)']
      },
      {
        key: 'aprobacion',
        label: 'Aprobación por Escrito',
        placeholder: 'ej. Ningún equipo puede reemplazarse sin aprobación escrita del Production Manager',
        prefix: 'Aprobación por escrito',
        chips: ['Aprobación por escrito obligatoria', 'Prohibida sustitución unilateral']
      },
      {
        key: 'penalizacion',
        label: 'Responsabilidad por Incumplimiento',
        placeholder: 'ej. El promotor asume los costos operativos ante fallas por equipos no homologados',
        prefix: 'Penalización por incumplimiento',
        chips: ['Promotor asume costos por desviación técnica', 'Derecho a suspensión por falla de seguridad']
      }
    ]
  },

  // ==========================================
  // --- HOSPITALITY ---
  // ==========================================
  'hosp-camerinos': {
    sectionTitleHint: 'Camerinos & Acondicionamiento',
    fields: [
      {
        key: 'principal',
        label: 'Camerino Principal (Artista)',
        placeholder: 'ej. Baño privado con ducha, A/C a 21°C, sofá cómodo, espejo de cuerpo entero con luz cálida',
        prefix: 'Camerino Principal',
        chips: ['Baño privado con ducha', 'Climatización 21°C - 22°C', 'Espejo de maquillaje luz cálida', 'Cerradura con llave para Tour Manager']
      },
      {
        key: 'banda',
        label: 'Camerino de Banda / Músicos',
        placeholder: 'ej. Capacidad para 6 personas, percheros con ganchos, toallas limpias, asientos',
        prefix: 'Camerino de Músicos / Banda',
        chips: ['Capacidad 6-8 personas', 'Percheros y sofás cómodos', 'Espejo de cuerpo entero']
      },
      {
        key: 'crew',
        label: 'Camerino de Crew / Producción',
        placeholder: 'ej. Mesa de trabajo, tomas eléctricas, red Wi-Fi privada de alta velocidad para producción',
        prefix: 'Camerino de Crew / Producción',
        chips: ['Wi-Fi privado alta velocidad exclusivo', 'Mesa de producción con 8 tomas AC']
      }
    ]
  },
  'hosp-catering': {
    sectionTitleHint: 'Catering, Menú & Dietas Especiales',
    fields: [
      {
        key: 'pax',
        label: 'Total de Raciones (PAX)',
        placeholder: 'ej. 14 PAX para almuerzo caliente y 14 PAX para cena post-show',
        prefix: 'Raciones (PAX)',
        chips: ['10 PAX', '14 PAX', '20 PAX', 'Almuerzo caliente + Cena post-show']
      },
      {
        key: 'horarios',
        label: 'Horarios de Servicio de Comida',
        placeholder: 'ej. Almuerzo a las 13:30, Merienda a las 17:00, Cena post-show a las 22:30',
        prefix: 'Horarios de servicio',
        chips: ['Almuerzo 13:30 / Merienda 17:00 / Cena 22:30', 'Cena caliente post-show garantizada']
      },
      {
        key: 'dietas',
        label: 'Dietas Especiales & Alergias',
        placeholder: 'ej. 2x Vegetarianos, 1x Vegano, 1x Celíaco estricto (sin TACC), 1x Sin Lactosa',
        prefix: 'Restricciones alimentarias',
        chips: ['2x Opciones vegetarianas', '1x Vegano estricto', '1x Celíaco (Sin Gluten / Sin TACC)', 'Sin mariscos ni nueces']
      },
      {
        key: 'buyout',
        label: 'Opción Buyout (Viáticos en Efectivo)',
        placeholder: 'ej. Opción de $40 USD por persona en efectivo si no se provee servicio in-situ',
        prefix: 'Opción Buyout',
        chips: ['Opción Buyout: $35 USD / PAX', 'Opción Buyout: $45 USD / PAX', 'Pago contra entrega en soundcheck']
      },
      {
        key: 'vajilla',
        label: 'Vajilla & Sustentabilidad',
        placeholder: 'ej. Vajilla de cerámica y cubiertos metálicos (prohibido plástico de un solo uso)',
        prefix: 'Vajilla sustentable',
        chips: ['Cerámica y cubiertos metálicos', 'Cero plástico de un solo uso', 'Estación de reciclaje']
      }
    ]
  },
  'hosp-bebidas': {
    sectionTitleHint: 'Hidratación & Cuidado Vocal',
    fields: [
      {
        key: 'agua',
        label: 'Agua Mineral',
        placeholder: 'ej. 24 botellas 500ml sin gas (12 al clima + 12 frías en nevera)',
        prefix: 'Agua mineral sin gas',
        chips: ['24 botellas 500ml sin gas (12 clima / 12 frías)', '48 botellas 500ml sin gas']
      },
      {
        key: 'cafe',
        label: 'Estación de Café & Bebidas Calientes',
        placeholder: 'ej. Cafetera espresso, café de grano, leche vegetal (avena/almendra), miel',
        prefix: 'Estación de café',
        chips: ['Cafetera espresso de grano', 'Leche de avena y almendra', 'Té verde y negro']
      },
      {
        key: 'vocal',
        label: 'Cuidado Vocal del Artista',
        placeholder: 'ej. Jengibre fresco cortado, limones orgánicos, miel pura y té de manzanilla',
        prefix: 'Cuidado vocal del artista',
        chips: ['Jengibre fresco, miel orgánica y limón', 'Té de manzanilla caliente', 'Termo con agua caliente']
      },
      {
        key: 'escenario',
        label: 'Bebidas & Toallas para Tarima',
        placeholder: 'ej. 12 botellas pequeñas sin gas y 6 toallas negras limpias en tarima',
        prefix: 'Bebidas para escenario',
        chips: ['12 botellas pequeñas a temperatura ambiente', '6 toallas negras limpias en posiciones']
      }
    ]
  },
  'hosp-lavanderia': {
    sectionTitleHint: 'Guardarropa, Lavandería & Toallas',
    fields: [
      {
        key: 'lavanderia',
        label: 'Servicio de Lavado Exprés',
        placeholder: 'ej. Servicio de lavandería y planchado exprés (retorno en menos de 24h) para vestuario',
        prefix: 'Lavandería de vestuario',
        chips: ['Lavado y planchado exprés (<24 horas)', 'Dry cleaning para vestuario de escena']
      },
      {
        key: 'toallas_camerino',
        label: 'Dotación de Toallas de Camerino',
        placeholder: 'ej. 8 toallas de baño grandes limpias y secas en camerino principal y banda',
        prefix: 'Toallas de camerino',
        chips: ['8 toallas de baño grandes blancas', 'Toallas limpias y secas a la llegada']
      },
      {
        key: 'toallas_show',
        label: 'Toallas Negras de Escenario',
        placeholder: 'ej. 10 toallas de mano color negro absoluto para uso durante el show',
        prefix: 'Toallas de escenario',
        chips: ['10 toallas de mano color negro absoluto', 'Ubicadas en tarimas previo al show']
      }
    ]
  },
  'hosp-hotel': {
    sectionTitleHint: 'Hotelería & Alojamiento',
    fields: [
      {
        key: 'categoria',
        label: 'Categoría & Ubicación del Hotel',
        placeholder: 'ej. Hotel 5 estrellas o Boutique Superior a menos de 20 min del recinto',
        prefix: 'Categoría de hotel',
        chips: ['Hotel 5 Estrellas (máx 20 min del venue)', 'Hotel 4 Estrellas Superior Boutique']
      },
      {
        key: 'habitaciones',
        label: 'Distribución de Habitaciones',
        placeholder: 'ej. 1 Master Suite para artista + 6 habitaciones dobles estándar para banda y crew',
        prefix: 'Distribución',
        chips: ['1 Master Suite + 6 Dobles Estándar', '1 Suite Junior + 4 Dobles + 2 Individuales']
      },
      {
        key: 'condiciones',
        label: 'Condiciones de Estadía Garantizadas',
        placeholder: 'ej. Desayuno buffet incluido, Wi-Fi de alta velocidad, Late Check-out a las 16:00',
        prefix: 'Condiciones garantizadas',
        chips: ['Late Check-out 16:00 garantizado', 'Early Check-in 09:00', 'Desayuno buffet incluido', 'Wi-Fi alta velocidad']
      }
    ]
  },
  'hosp-transporte': {
    sectionTitleHint: 'Transporte Local & Logística de Carga',
    fields: [
      {
        key: 'vehiculos',
        label: 'Flota Vehicular para Personas',
        placeholder: 'ej. 2 Camionetas ejecutivas tipo Van (Mercedes Sprinter) con A/C y vidrios polarizados',
        prefix: 'Flota vehicular',
        chips: ['2x Camionetas Vans ejecutivas (Mercedes Sprinter)', '1x SUV ejecutiva blindada para artista']
      },
      {
        key: 'carga',
        label: 'Vehículo de Carga de Equipajes',
        placeholder: 'ej. 1 Camioneta cerrada o van con espacio amplio para instrumentos personales y maletas',
        prefix: 'Camioneta de carga auxiliar',
        chips: ['Van de carga cerrada para equipajes/instrumentos', 'Capacidad para 20 maletas grandes']
      },
      {
        key: 'itinerario',
        label: 'Itinerario de Rutas & Disponibilidad',
        placeholder: 'ej. Choferes profesionales a disposición: Aeropuerto ↔ Hotel ↔ Recinto ↔ Aeropuerto',
        prefix: 'Itinerario completo',
        chips: ['Disponibilidad exclusiva 24/7 con chofer bilingüe', 'Aeropuerto ↔ Hotel ↔ Recinto ↔ Aeropuerto']
      }
    ]
  },

  // ==========================================
  // --- SEGURIDAD ---
  // ==========================================
  'seg-perimetro': {
    sectionTitleHint: 'Perímetro, Accesos & Drones',
    fields: [
      {
        key: 'accesos',
        label: 'Control en Puertas y Carga',
        placeholder: 'ej. Control estricto en puertas principales, accesos vehiculares y muelles de carga',
        prefix: 'Control estricto de accesos',
        chips: ['Control estricto puertas y muelles de carga', 'Personal de seguridad acreditado']
      },
      {
        key: 'filtros',
        label: 'Filtros con Detectores de Metal',
        placeholder: 'ej. Pórticos detectores de metales, detectores manuales y cacheo superficial',
        prefix: 'Filtros y detectores',
        chips: ['Arcos detectores de metales en accesos', 'Detectores manuales tipo garret']
      },
      {
        key: 'acreditacion',
        label: 'Acreditaciones & Pulseras Zonificadas',
        placeholder: 'ej. Sistema de pulseras holográficas por zonas (All Access, Backstage, Escenario)',
        prefix: 'Sistema de acreditaciones',
        chips: ['Pulseras holográficas zonificadas', 'Credenciales con foto para crew local']
      },
      {
        key: 'drones',
        label: 'Política Antidrones & Objetos Prohibidos',
        placeholder: 'ej. Prohibición total de sobrevuelo de drones no autorizados sobre público o escenario',
        prefix: 'Política antidrones',
        chips: ['Prohibición absoluta de drones sobre escenario', 'Prohibido envases de vidrio, armas y pirotecnia']
      }
    ]
  },
  'seg-foso': {
    sectionTitleHint: 'Vallas Mojo, Foso (Pit) & Hidratación',
    fields: [
      {
        key: 'vallas',
        label: 'Vallas de Contención Mojo',
        placeholder: 'ej. Vallas antipánico de aluminio certificadas tipo Mojo Barriers frente a tarima',
        prefix: 'Vallas Mojo certificadas',
        chips: ['Mojo Barriers de aluminio certificadas', 'Escalón posterior integrado para vigilancia']
      },
      {
        key: 'distancia',
        label: 'Distancia Escenario - Vallas (Foso)',
        placeholder: 'ej. Distancia mínima requerida de 1.80 metros frente a tarima con pasillo despejado',
        prefix: 'Foso libre (Pit)',
        chips: ['Distancia mínima 1.80m a tarima', 'Pasillo central despejado de extracción']
      },
      {
        key: 'hidratacion',
        label: 'Suministro de Agua en Foso (Público)',
        placeholder: 'ej. Suministro continuo de agua potable en vasos por parte de seguridad a primeras filas',
        prefix: 'Hidratación masiva',
        chips: ['Suministro continuo de agua a primeras filas', 'Prevención de desmayos y síncopes']
      },
      {
        key: 'prensa',
        label: 'Protocolo de Fotógrafos & Prensa',
        placeholder: 'ej. Primeras 3 canciones sin flash en foso pit para prensa autorizada',
        prefix: 'Protocolo de fotógrafos',
        chips: ['Primeras 3 canciones sin flash', 'Salida inmediata de prensa tras tema 3']
      }
    ]
  },
  'seg-custodia': {
    sectionTitleHint: 'Custodia del Artista & Backstage Estéril',
    fields: [
      {
        key: 'agentes',
        label: 'Agentes de Custodia Personal',
        placeholder: 'ej. 2 agentes de seguridad privada asignados permanentemente al artista',
        prefix: 'Custodia personal',
        chips: ['2x Agentes de custodia privada dedicados', 'Custodia en traslados y camerinos']
      },
      {
        key: 'pasillo',
        label: 'Perímetro Estéril de Camerinos',
        placeholder: 'ej. Pasillo de camerinos como zona estéril con control estricto de puerta',
        prefix: 'Backstage estéril',
        chips: ['Pasillo estéril con guardia en puerta', 'Acceso exclusivo con pulsera All Access']
      },
      {
        key: 'ruta',
        label: 'Ruta Segura a Escenario & Avance',
        placeholder: 'ej. Corredor seguro e iluminado desde camerino hasta tarima con reunión previa de avance',
        prefix: 'Ruta de escape y acceso',
        chips: ['Ruta iluminada y despejada a tarima', 'Reunión de avance de seguridad 2h antes de puertas']
      }
    ]
  },
  'seg-emergencias': {
    sectionTitleHint: 'Unidad Médica, Evacuación & Primeros Auxilios',
    fields: [
      {
        key: 'ambulancia',
        label: 'Ambulancia Medicalizada de Soporte Vital',
        placeholder: 'ej. Ambulancia de soporte vital avanzado en punto fijo detrás de tarima',
        prefix: 'Ambulancia de soporte vital avanzado',
        chips: ['Ambulancia de soporte vital avanzado fija', 'Ubicada detrás de tarima durante todo el show']
      },
      {
        key: 'paramedicos',
        label: 'Personal Paramédico & DEA',
        placeholder: 'ej. 2 paramédicos equipados con Desfibrilador Externo Automático (DEA) en tarima',
        prefix: 'Personal paramédico y DEA',
        chips: ['2x Paramédicos con desfibrilador (DEA)', 'Botiquín de trauma de intervención rápida']
      },
      {
        key: 'evacuacion',
        label: 'Rutas de Evacuación Médica',
        placeholder: 'ej. Salidas de emergencia despejadas y ruta rápida coordinada con hospital local',
        prefix: 'Rutas de evacuación médica',
        chips: ['Ruta despejada hacia hospital de trauma más cercano', 'Salidas de emergencia señalizadas']
      },
      {
        key: 'extintores',
        label: 'Extintores en Escenario & FOH',
        placeholder: 'ej. 4 extintores de CO2 de 5kg en esquinas de tarima y cabina FOH',
        prefix: 'Extintores en tarima',
        chips: ['4x Extintores CO2 5kg en esquinas de tarima', 'Extintor dedicado en cabina FOH']
      }
    ]
  },
  'seg-sfx': {
    sectionTitleHint: 'Seguridad en Efectos Especiales & Pirotecnia',
    fields: [
      {
        key: 'permisos',
        label: 'Permisos Oficiales de Bomberos',
        placeholder: 'ej. Autorización oficial de autoridades locales para uso de efectos pirotécnicos o CO2',
        prefix: 'Permisos bomberiles',
        chips: ['Permiso oficial de bomberos aprobado', 'Hojas de seguridad química (MSDS) in-situ']
      },
      {
        key: 'distancias',
        label: 'Perímetro de Exclusión y Distancias',
        placeholder: 'ej. Perímetro de exclusión mínimo de 3 metros respecto a músicos y público',
        prefix: 'Distancias de seguridad',
        chips: ['Perímetro mínimo 3 metros a músicos y público', 'Marcación visual en piso de escenario']
      },
      {
        key: 'bombero',
        label: 'Técnico de Bomberos de Retén',
        placeholder: 'ej. Presencia obligatoria de técnico de bomberos con extintor presurizado en laterales',
        prefix: 'Bombero de retén',
        chips: ['Bombero de retén con extintor en lateral', 'Parada de emergencia (E-Stop) en cabina']
      }
    ]
  },
  'seg-clima': {
    sectionTitleHint: 'Protocolo Meteorológico & Viento Límite',
    fields: [
      {
        key: 'anemometro',
        label: 'Monitoreo de Viento (Anemómetro)',
        placeholder: 'ej. Anemómetro instalado en la estructura de tarima con lectura en tiempo real',
        prefix: 'Monitoreo de viento',
        chips: ['Anemómetro digital instalado en tarima', 'Registro continuo de rachas de viento']
      },
      {
        key: 'viento_limite',
        label: 'Velocidad de Viento Límite Crítica',
        placeholder: 'ej. Descolgar pantallas y line arrays si el viento supera los 45 km/h sostenidos',
        prefix: 'Velocidad de viento crítica',
        chips: ['Límite 45 km/h: Bajar pantallas y PA', 'Límite 65 km/h: Suspensión total y evacuación']
      },
      {
        key: 'tormenta',
        label: 'Alerta por Tormenta Eléctrica',
        placeholder: 'ej. Protocolo de corte de energía y evacuación ante rayos a menos de 5 km del recinto',
        prefix: 'Alerta por tormenta eléctrica',
        chips: ['Radio de seguridad de 5 km ante caída de rayos', 'Protocolo coordinado con Protección Civil']
      }
    ]
  }
};
