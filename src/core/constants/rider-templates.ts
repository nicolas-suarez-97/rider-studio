import { RiderType, RiderDefinition } from '../types/rider.types';

export const RIDER_DATA: Record<RiderType, RiderDefinition> = {
  tecnico: {
    title: 'Rider Técnico de Audio & Escenario',
    badge: 'Producción Técnica',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Especificaciones acústicas, microfonía, monitores, backline y distribución de tarima.',
    sections: [
      {
        id: 'tech-contactos',
        num: '01',
        title: 'Info General & Contactos Clave',
        subtitle: 'Producción, sonido FOH, monitores y stage',
        tag: 'Contactos',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'users',
        content: '• Artista / Banda: [Nombre del Artista o Banda]\n• Management / Producción Ejecutiva: [Nombre / Teléfono / Email]\n• Ingeniero FOH / Sonido de Sala: [Nombre / Teléfono / Email]\n• Ingeniero de Monitores: [Nombre / Teléfono / Email]\n• Stage Manager / Jefe de Escenario: [Nombre / Teléfono / Email]\n• Fecha y Venue del Evento: [Ciudad, Recinto, Fecha]'
      },
      {
        id: 'tech-pa',
        num: '02',
        title: 'Sistema de PA & Consola FOH',
        subtitle: 'Line Array, presión sonora y consola de sala',
        tag: 'Audio FOH',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'speaker',
        content: '• Criterio PA: Sistema Line Array profesional de primer nivel (ej: L-Acoustics, d&b audiotechnik, Meyer Sound).\n• Cobertura: Cobertura homogénea y coherente en todo el recinto con mínimo 110 dBA SPL continuo sin distorsión.\n• Consola FOH preferida: [Especificar consola digital principal, ej: DiGiCo, Avid S6L, Yamaha CL5].\n• Conectividad: Líneas Cat6e blindadas desde escenario a FOH, split pasivo aislado por transformadores.'
      },
      {
        id: 'tech-monitores',
        num: '03',
        title: 'Monitoreo & Sistema IEM',
        subtitle: 'In-Ears inalámbricos, mezclas y cuñas',
        tag: 'Monitores',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'headphones',
        content: '• Sistema de IEM (In-Ear Monitors): Cantidad de canales inalámbricos estéreo requeridos (especificar marca/modelo ej: Shure PSM1000 / Sennheiser G4).\n• Monitores de Piso: Cantidad de cuñas/wedges bi-amplificadas de 12" o 15" y mezclas independientes.\n• Side fills y Drum fill: Requerimientos de subwoofers y satélites para cobertura lateral y batería.\n• Consola de Monitores: [Especificar consola de monitores dedicada o si se comparte con FOH].'
      },
      {
        id: 'tech-backline',
        num: '04',
        title: 'Backline Requerido',
        subtitle: 'Instrumentos, amplificadores & atriles',
        tag: 'Instrumentos',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'guitar',
        content: '• Batería: Medidas de bombo, toms, redoblante, marca de parches y atriles.\n• Bajo: Cabezal y gabinete (ej: 8x10" / 4x10").\n• Guitarras: Amplificadores valvulares requeridos con footswitch.\n• Teclados: Modelos específicos, fuentes de poder y atriles reforzados.'
      },
      {
        id: 'tech-inputlist',
        num: '05',
        title: 'Input List & Patch de Escenario',
        subtitle: 'Canales, microfonía y cajas directas',
        tag: 'Canales',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'list',
        content: 'Configura en la tabla interactiva inferior los canales de entrada, transductores (micrófonos dinámicos/condensador), cajas directas activas (DI) y phantom power (+48V).'
      },
      {
        id: 'tech-stageplot',
        num: '06',
        title: 'Stage Plot & Tomas de Corriente',
        subtitle: 'Distribución en tarima y acometida AC',
        tag: 'Tarima',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'map',
        content: '• Dimensiones mínimas de tarima (ancho x profundidad x altura).\n• Risers (tarimas elevadas con ruedas y freno) para batería o percusión.\n• Distribución espacial de los músicos (Stage Left, Center, Stage Right).\n• Puntos de corriente eléctrica regulada y aterrizada por posición (110V/220V).'
      },
      {
        id: 'tech-iluminacion',
        num: '07',
        title: 'Iluminación, Video & Efectos',
        subtitle: 'Patch DMX, pantallas LED & FX',
        tag: 'Visuales',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'lightbulb',
        content: '• Consola de control de luces requerida con universo Art-Net/sACN.\n• Tipos de luminarias mínimas (Spot, Beam, Wash, Strobes y cegadoras).\n• Pantalla LED de fondo (dimensiones mínimas, pitch P3.9 y procesador).\n• Máquinas de niebla o humo base agua para visualización de haces.'
      }
    ]
  },
  hospitality: {
    title: 'Rider de Hospitality & Catering',
    badge: 'Hospitality & Catering',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Requisitos de camerinos, catering, régimen de dietas, hotel y transporte de gira.',
    sections: [
      {
        id: 'hosp-camerinos',
        num: '01',
        title: 'Camerinos & Acondicionamiento',
        subtitle: 'Camerino principal y camerinos de banda',
        tag: 'Confort',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'door',
        content: '• Camerino Principal: Capacidad, baño privado, climatización (temperatura requerida), espejo de cuerpo entero con iluminación cálida de maquillaje y sofás.\n• Camerino de Músicos / Banda: Capacidad mínima, perchero con ganchos, toallas limpias y asientos cómodos.\n• Camerino de Crew / Producción: Mesa de trabajo con tomas eléctricas e internet de alta velocidad.'
      },
      {
        id: 'hosp-catering',
        num: '02',
        title: 'Catering, Comidas & Dietas',
        subtitle: 'Almuerzo, cena y dietas especiales',
        tag: 'Alimentación',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'wine',
        content: '• Número total de raciones (PAX) para almuerzo y cena.\n• Horarios requeridos de servicio de comidas calientes según cronograma de producción.\n• Restricciones alimentarias: Cantidad de opciones vegetarianas, veganas, celíacas o libres de lactosa.\n• Vajilla, cubiertos y servilletas de material reutilizable o biodegradable (no plástico de un solo uso).'
      },
      {
        id: 'hosp-bebidas',
        num: '03',
        title: 'Hidratación, Bebidas & Cuidado Vocal',
        subtitle: 'Estación de café, agua y jengibre',
        tag: 'Bebidas',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'coffee',
        content: '• Agua mineral sin gas: Cantidad de botellas requeridas (temperatura ambiente y frías).\n• Estación de café: Cafetera espresso, café de grano, leche vegetal (avena/almendra) y endulzantes.\n• Cuidado vocal: Jengibre fresco, miel orgánica, limones cortados y té de hierbas.\n• Bebidas para escenario: Botellas pequeñas y toallas de mano para tarima.'
      },
      {
        id: 'hosp-hotel',
        num: '04',
        title: 'Hotelería & Alojamiento',
        subtitle: 'Hotel, suites y habitaciones dobles',
        tag: 'Hospedaje',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'hotel',
        content: '• Categoría de hotel requerida (4 o 5 estrellas) ubicado a corta distancia del recinto.\n• Distribución: Suite o Junior Suite para artista principal + habitaciones individuales/dobles para banda y crew.\n• Condiciones: Desayuno incluido, Wi-Fi de alta velocidad, check-in temprano o late check-out confirmado.'
      },
      {
        id: 'hosp-transporte',
        num: '05',
        title: 'Transporte Local & Transfers',
        subtitle: 'Vehículos con chofer y logística',
        tag: 'Logística',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'truck',
        content: '• Tipo de vehículos requeridos (ej: Camionetas ejecutivas tipo Van con aire acondicionado).\n• Chofer profesional a disposición de la producción durante la estadía.\n• Itinerario de rutas: Aeropuerto ↔ Hotel ↔ Recinto del evento ↔ Retorno al aeropuerto.'
      }
    ]
  },
  seguridad: {
    title: 'Rider de Seguridad & Protocolos Venue',
    badge: 'Seguridad & Protocolos',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Protocolos de acceso, custodia de artistas, vallas Mojo de contención y contingencia.',
    sections: [
      {
        id: 'seg-perimetro',
        num: '01',
        title: 'Perímetro & Control de Accesos',
        subtitle: 'Filtros, detectores y acreditaciones',
        tag: 'Control',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'shield',
        content: '• Control estricto de acceso en puertas principales, accesos vehiculares y áreas de carga.\n• Filtros de seguridad con detectores de metales y revisión reglamentaria de bolsos.\n• Sistema de acreditación y pulseras por zonas (All Access, Backstage, Escenario, VIP).\n• Política clara de objetos prohibidos para el público asistente.'
      },
      {
        id: 'seg-foso',
        num: '02',
        title: 'Vallas Mojo & Foso de Prensa (Pit)',
        subtitle: 'Vallas de contención antipánico',
        tag: 'Barrera',
        tagColor: 'bg-slate-100 text-slate-700',
        iconName: 'barrier',
        content: '• Vallas de contención antipánico certificadas (tipo Mojo Barriers) frente al escenario.\n• Distancia mínima requerida entre el escenario y la primera línea de vallas (foso/pit).\n• Pasillo central libre para extracción rápida y personal de seguridad apostado cada 2 metros.\n• Protocolo para fotógrafos y prensa autorizada.'
      },
      {
        id: 'seg-custodia',
        num: '03',
        title: 'Seguridad Personal & Backstage Estéril',
        subtitle: 'Custodia de artista y zona de camerinos',
        tag: 'Custodia',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'userCheck',
        content: '• Agentes de custodia privada asignados al artista principal en traslados y camerinos.\n• Pasillo de camerinos mantenido como perímetro estéril con control estricto de puerta.\n• Ruta de acceso rápido y seguro desde el camerino hasta el escenario.\n• Prohibición absoluta de personas no acreditadas en áreas de descanso del artista.'
      },
      {
        id: 'seg-emergencias',
        num: '04',
        title: 'Unidad Médica, Evacuación & Aforo',
        subtitle: 'Ambulancia, paramédicos & extintores',
        tag: 'Emergencias',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'heartPulse',
        content: '• Ambulancia de soporte vital avanzado en punto fijo detrás de tarima.\n• Personal paramédico y de primeros auxilios disponible durante montaje, show y desmontaje.\n• Plan de evacuación de emergencia y salidas despejadas hacia el hospital más cercano.\n• Extintores de CO2 y PQS ubicados en puntos estratégicos de escenario y cabina FOH.'
      }
    ]
  }
};
