import { RiderType, RiderDefinition } from '../types/rider.types';

export const RIDER_DATA: Record<RiderType, RiderDefinition> = {
  tecnico: {
    title: 'Rider Técnico de Audio & Escenario',
    badge: 'Producción Técnica',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Especificaciones acústicas, microfonía, monitores, backline, rigging y distribución de tarima.',
    sections: [
      {
        id: 'tech-contactos',
        num: '01',
        title: 'Info General & Contactos Clave',
        subtitle: 'Producción, sonido FOH, monitores y stage',
        tag: 'Contactos',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'users',
        content: '• Artista / Banda: [Nombre del Artista o Banda]\n• Management / Producción Ejecutiva: [Nombre / Teléfono / Email]\n• Ingeniero FOH / Sonido de Sala: [Nombre / Teléfono / Email]\n• Ingeniero de Monitores: [Nombre / Teléfono / Email]\n• Diseñador de Iluminación (LD) / Video: [Nombre / Teléfono / Email]\n• Stage Manager / Jefe de Escenario: [Nombre / Teléfono / Email]\n• Fecha y Venue del Evento: [Ciudad, Recinto, Fecha]'
      },
      {
        id: 'tech-pa',
        num: '02',
        title: 'Sistema de PA & Consola FOH',
        subtitle: 'Line Array, presión sonora y consola de sala',
        tag: 'Audio FOH',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'speaker',
        content: '• Criterio PA: Sistema Line Array profesional de primer nivel (Preferencia Tier 1: L-Acoustics K1/K2, d&b audiotechnik GSL/KSL, Meyer Sound Panther).\n• Cobertura & SPL: Cobertura homogénea (+/-3dB) en toda la audiencia con mínimo 102 dBA continuo / 114 dBC pico en FOH (10-12 dB de headroom sin distorsión).\n• Ingeniero de Sistemas: Obligatoriedad de presencia de técnico de sistemas certificado por el fabricante durante alineación y show.\n• Consola FOH preferida: [Tier 1: DiGiCo Quantum 338 / Avid S6L / Yamaha Rivage PM5. Tier 2: DiGiCo SD12 / Yamaha CL5].\n• Conectividad: Líneas Cat6e blindadas etherCON desde escenario a FOH, split pasivo aislado por transformadores.'
      },
      {
        id: 'tech-monitores',
        num: '03',
        title: 'Monitoreo, IEM & Radiofrecuencia (RF)',
        subtitle: 'In-Ears inalámbricos, mezclas, cuñas y RF',
        tag: 'Monitores',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'headphones',
        content: '• Sistema de IEM (In-Ear Monitors): Cantidad de canales inalámbricos estéreo requeridos (ej: Shure PSM1000 / Sennheiser 2000 con combinador de antena activo).\n• Coordinación de RF: Escaneo de radiofrecuencia obligatorio in-situ previo al soundcheck.\n• Monitores de Piso: Cuñas/wedges bi-amplificadas de 15" (d&b M4 o L-Acoustics X15) y mezclas independientes.\n• Side fills y Drum fill: Subwoofer 18" + satélite para batería; 2x side fills estéreo en laterales.\n• Consola de Monitores: [Consola dedicada de 48+ canales con split pasivo aislado galvánicamente].'
      },
      {
        id: 'tech-backline',
        num: '04',
        title: 'Backline Requerido & Voltajes',
        subtitle: 'Instrumentos, amplificadores & transformadores',
        tag: 'Instrumentos',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'guitar',
        content: '• Batería: Medidas de bombo, toms, redoblante, alfombra antideslizante obligatoria y banquetas de eje roscado.\n• Bajo: Cabezal y gabinete (ej: Ampeg SVT-CL + 8x10" / Aguilar).\n• Guitarras: Amplificadores valvulares requeridos con footswitch y transformadores de voltaje 110V/220V si aplica.\n• Teclados: Modelos específicos, fuentes de poder originales y atriles reforzados.'
      },
      {
        id: 'tech-inputlist',
        num: '05',
        title: 'Input List & Patch de Escenario',
        subtitle: 'Canales, microfonía, cajas directas y phantom',
        tag: 'Canales',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'list',
        content: 'Configura en la tabla interactiva inferior los canales de entrada, transductores principales y sustitutos homologados, tipos de atril, alimentación phantom (+48V) y sub-snakes de escenario.'
      },
      {
        id: 'tech-stageplot',
        num: '06',
        title: 'Stage Plot & Acometida Eléctrica',
        subtitle: 'Distribución en tarima, risers y tierra aislada',
        tag: 'Tarima',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'map',
        content: '• Dimensiones mínimas de tarima: Ancho x profundidad x altura libre de obstáculos.\n• Risers: Tarimas elevadas con freno y alfombra negra (ej: 2.40m x 2.40m x 0.40m para batería).\n• Distribución espacial: Posiciones físicas de músicos en escenario (Stage Left, Center, Stage Right).\n• Puntos de corriente (AC Drops): Puntos regulados 20A con TIERRA FÍSICA AISLADA DEDICADA EXCLUSIVAMENTE PARA AUDIO (no compartida con luces).'
      },
      {
        id: 'tech-iluminacion',
        num: '07',
        title: 'Iluminación, Pantallas LED & Visuales',
        subtitle: 'Patch DMX, luminarias, pantalla LED y niebla',
        tag: 'Visuales',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'lightbulb',
        content: '• Consola de control de luces: GrandMA3 o ChamSys con universos Art-Net/sACN.\n• Luminarias mínimas: Spot, Beam, Wash LED, Strobes y cegadoras incandescentes.\n• Pantalla LED de fondo: Dimensiones mínimas, pitch P3.9 o menor, tasa de refresco 3840Hz y procesador NovaStar/Brompton.\n• Máquinas de niebla: Exclusivamente máquinas base agua (Hazer). Prohibido uso de niebla base aceite.'
      },
      {
        id: 'tech-rigging',
        num: '08',
        title: 'Rigging, Cargas & Puntos de Cuelgue',
        subtitle: 'Motores, truss, cargas estáticas y dinámicas',
        tag: 'Estructuras',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'anchor',
        content: '• Puntos de cuelgue de PA: Capacidad mínima de 1 a 2 toneladas por punto con grilletes y eslingas certificadas.\n• Puntos de rigging de iluminación: Distribución de puentes de luces (Frontal, Contra y Calles).\n• Rigger certificado: Presencia obligatoria de rigger profesional para supervisar el cálculo de cargas y colgado.'
      },
      {
        id: 'tech-terminos',
        num: '09',
        title: 'Condiciones Contractuales & SLA Contra-Rider',
        subtitle: 'Aprobación de sustituciones y plazos de entrega',
        tag: 'Términos',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'fileCheck',
        content: '• Plazo de Contra-Rider: Toda propuesta de sustitución debe remitirse con un mínimo de 15 días hábiles previo al evento.\n• Aprobación por escrito: Ningún equipo puede reemplazarse sin el consentimiento expreso y por escrito del ingeniero responsable.\n• Penalización por incumplimiento: El promotor asume la responsabilidad operativa y financiera ante cualquier desviación técnica no acordada.'
      }
    ]
  },
  hospitality: {
    title: 'Rider de Hospitality & Catering',
    badge: 'Hospitality & Catering',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Requisitos de camerinos, catering, régimen de dietas, lavandería, hotel y transporte de gira.',
    sections: [
      {
        id: 'hosp-camerinos',
        num: '01',
        title: 'Camerinos & Acondicionamiento',
        subtitle: 'Camerino principal, banda y seguridad privada',
        tag: 'Confort',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'door',
        content: '• Camerino Principal: Baño privado, climatización (21°C - 22°C), sofá cómodo, espejo de maquillaje con luz cálida y cerradura con llave entregada al Tour Manager.\n• Camerino de Músicos / Banda: Capacidad mínima, percheros con ganchos, toallas limpias y asientos confortables.\n• Camerino de Crew / Producción: Mesa de trabajo, tomas eléctricas y red Wi-Fi privada de alta velocidad para producción.'
      },
      {
        id: 'hosp-catering',
        num: '02',
        title: 'Catering, Menú & Dietas Especiales',
        subtitle: 'Almuerzo, cena, horarios y opción buyout',
        tag: 'Alimentación',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'wine',
        content: '• Raciones (PAX): Número total de raciones para almuerzo y cena caliente post-soundcheck.\n• Horarios de servicio: Coordinados estrictamente con el cronograma de montaje y pruebas de sonido.\n• Restricciones alimentarias: Detalle de opciones vegetarianas, veganas, celíacas (sin TACC) y sin lactosa.\n• Opción Buyout: Cláusula de pago de viáticos en efectivo por persona en caso de no proveer catering in-situ.\n• Vajilla sustentable: Cerámica o materiales biodegradables (prohibido plástico de un solo uso).'
      },
      {
        id: 'hosp-bebidas',
        num: '03',
        title: 'Hidratación, Bebidas & Cuidado Vocal',
        subtitle: 'Estación de café, té, jengibre y tarima',
        tag: 'Bebidas',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'coffee',
        content: '• Agua mineral sin gas: Botellas de 500ml a temperatura ambiente y frías.\n• Cuidado vocal del artista: Jengibre fresco cortado, limones orgánicos, miel pura de abeja y té caliente de manzanilla.\n• Estación de café: Cafetera espresso con café en grano y leches vegetales (avena/almendra).\n• Bebidas para escenario: Botellas de agua pequeñas sin gas y toallas negras ubicadas en posiciones de tarima.'
      },
      {
        id: 'hosp-lavanderia',
        num: '04',
        title: 'Guardarropa, Lavandería & Toallas',
        subtitle: 'Servicio de lavado exprés y dotación de toallas',
        tag: 'Vestuario',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'shirt',
        content: '• Lavandería de vestuario: Servicio de tintorería y lavado exprés (retorno en menos de 24 horas) para vestuario de escena.\n• Toallas de camerino: Toallas de baño limpias y secas para aseo personal post-show.\n• Toallas de escenario: Toallas de mano de color negro absoluto para uso durante el concierto.'
      },
      {
        id: 'hosp-hotel',
        num: '05',
        title: 'Hotelería & Alojamiento',
        subtitle: 'Hotel, suites, late check-out y desayuno',
        tag: 'Hospedaje',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'hotel',
        content: '• Categoría de hotel: 4 o 5 estrellas ubicado a menos de 20 minutos del recinto del evento.\n• Distribución: 1 Master Suite para artista principal + habitaciones dobles estándar para banda y equipo técnico.\n• Condiciones garantizadas: Desayuno buffet incluido, Wi-Fi de alta velocidad, Early Check-in y Late Check-out garantizado hasta las 16:00.'
      },
      {
        id: 'hosp-transporte',
        num: '06',
        title: 'Transporte Local & Logística de Carga',
        subtitle: 'Vans ejecutivas, chofer y transporte de equipaje',
        tag: 'Logística',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'truck',
        content: '• Flota vehicular: Camionetas ejecutivas tipo Van (ej. Mercedes Sprinter) con aire acondicionado y chofer exclusivo.\n• Camioneta de carga auxiliar: Vehículo cerrado para traslado de equipajes personales e instrumentos de mano.\n• Itinerario completo: Aeropuerto ↔ Hotel ↔ Recinto (prueba de sonido y show) ↔ Retorno al aeropuerto.'
      }
    ]
  },
  seguridad: {
    title: 'Rider de Seguridad & Protocolos Venue',
    badge: 'Seguridad & Protocolos',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Protocolos de acceso, custodia de artistas, vallas Mojo de contención, pirotecnia y contingencia.',
    sections: [
      {
        id: 'seg-perimetro',
        num: '01',
        title: 'Perímetro, Accesos & Drones',
        subtitle: 'Filtros, detectores, pulseras y zona antidrones',
        tag: 'Control',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'shield',
        content: '• Control estricto de accesos: Puertas principales, portones vehiculares y muelles de descarga.\n• Filtros y detectores: Arcos detectores de metales y revisión reglamentaria de bolsos.\n• Sistema de acreditaciones: Matriz de pulseras zonificadas (All Access, Backstage, Escenario, FOH, VIP).\n• Política antidrones: Prohibición total de sobrevuelo de drones no autorizados sobre el público o escenario.'
      },
      {
        id: 'seg-foso',
        num: '02',
        title: 'Vallas Mojo, Foso (Pit) & Hidratación',
        subtitle: 'Vallas antipánico, pasillo y agua para público',
        tag: 'Barrera',
        tagColor: 'bg-slate-100 text-slate-700',
        iconName: 'barrier',
        content: '• Vallas Mojo certificadas: Barreras de aluminio antipánico con escalón de vigilancia frente a tarima.\n• Foso libre (Pit): Distancia mínima de 1.80m entre tarima y vallas con pasillo despejado de evacuación rápida.\n• Hidratación masiva: Suministro continuo de agua potable por parte del personal de seguridad a las primeras filas.\n• Protocolo de fotógrafos: Acceso restringido a primeras 3 canciones sin flash.'
      },
      {
        id: 'seg-custodia',
        num: '03',
        title: 'Custodia del Artista & Backstage Estéril',
        subtitle: 'Custodia personal, ruta a tarima y avance',
        tag: 'Custodia',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'userCheck',
        content: '• Custodia personal: Agentes de seguridad privada dedicados exclusivamente al artista en todo momento.\n• Backstage estéril: Pasillo de camerinos de acceso restringido estricto sin presencia de público ni invitados.\n• Ruta de escape y acceso: Corredor seguro e iluminado entre camerino y escenario con avance previo de seguridad.'
      },
      {
        id: 'seg-emergencias',
        num: '04',
        title: 'Unidad Médica, Evacuación & Primeros Auxilios',
        subtitle: 'Ambulancia medicalizada, DEA y extintores',
        tag: 'Emergencias',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'heartPulse',
        content: '• Ambulancia de soporte vital avanzado: Ubicada permanentemente en punto fijo detrás de tarima.\n• Personal paramédico y DEA: Paramédicos con Desfibrilador Externo Automático (DEA) en backstage durante todo el evento.\n• Rutas de evacuación médica: Salidas de emergencia despejadas hacia hospital de trauma más cercano.\n• Extintores en tarima: Extintores de CO2 y PQS en ambos lados de escenario y cabina FOH.'
      },
      {
        id: 'seg-sfx',
        num: '05',
        title: 'Seguridad en Efectos Especiales & Pirotecnia',
        subtitle: 'Permisos de bomberos, distancias mínimas y extintores',
        tag: 'Pirotecnia',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'flame',
        content: '• Permisos bomberiles: Autorización oficial de las autoridades locales para uso de efectos pirotécnicos o CO2.\n• Distancias de seguridad: Perímetro de exclusión mínimo de 3 metros respecto a músicos y público.\n• Bombero de retén: Presencia de técnico de bomberos con extintor presurizado en laterales de tarima.'
      },
      {
        id: 'seg-clima',
        num: '06',
        title: 'Protocolo Meteorológico & Viento Límite',
        subtitle: 'Anemómetro en tarima y plan de suspensión por tormenta',
        tag: 'Contingencia',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'cloudRain',
        content: '• Monitoreo de viento: Anemómetro instalado en la estructura de tarima con registro continuo de rachas de viento.\n• Velocidad de viento crítica: Protocolo de bajar techos, pantallas y line arrays si el viento supera los 45 km/h.\n• Alerta por tormenta eléctrica: Procedimiento coordinado de evacuación o corte eléctrico ante caída de rayos en radio de 5 km.'
      }
    ]
  }
};
