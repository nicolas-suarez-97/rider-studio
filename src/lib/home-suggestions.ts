export interface HomeSuggestion {
  label: string;
  prompt: string;
}

export const ARTIST_PROGRESS: HomeSuggestion[] = [
  { label: 'Microfonía', prompt: '¿Qué microfonía y cajas directas faltan en este rider?' },
  { label: 'Potencia eléctrica', prompt: 'Revisa la potencia eléctrica y la acometida de este rider.' },
  { label: 'Seguridad y aforo', prompt: '¿Qué medidas de seguridad y aforo faltan por escribir?' },
  { label: 'Input list', prompt: '¿Qué canales de la input list están incompletos?' },
  { label: 'Backline', prompt: '¿Qué backline falta por definir en este rider?' },
  { label: 'Stage plot', prompt: 'Revisa el stage plot y la distribución en tarima.' },
  { label: 'Hospitality', prompt: '¿Qué hospitality no está escrito todavía?' },
  { label: 'Monitores', prompt: 'Propón monitores e in-ears para este show.' },
  { label: 'Voltajes', prompt: 'Revisa voltajes, tierra aislada y acometida eléctrica.' },
  { label: 'Para cerrar', prompt: '¿Qué falta para cerrar este rider?' },
  { label: 'Resumen', prompt: 'Resume lo que ya está pedido y lo que todavía falta.' },
  { label: 'Iluminación', prompt: '¿Qué iluminación, LED y visuales faltan en el rider?' },
];

export const PROMOTOR_PROGRESS: HomeSuggestion[] = [
  { label: 'Inventario y PA', prompt: '¿Qué del inventario cubre el PA de este rider?' },
  { label: 'Hospitality', prompt: '¿Qué hospitality no está en el inventario?' },
  { label: 'Qué aprobar', prompt: '¿Qué secciones puedo aprobar con lo que tengo?' },
  { label: 'Pedidos sin datos', prompt: '¿Dónde el rider pide algo que no tengo?' },
  { label: 'Monitores', prompt: '¿Qué monitores e in-ears puedo cubrir?' },
  { label: 'Seguridad', prompt: '¿Qué seguridad queda rechazada?' },
  { label: 'Backline', prompt: '¿Qué backline no está en el inventario?' },
  { label: 'Sin respuesta', prompt: '¿Qué secciones siguen sin respuesta?' },
  { label: 'Alternativa de PA', prompt: '¿Qué alternativa puedo ofrecer en el sistema de PA?' },
  { label: 'Contactos', prompt: '¿Qué contactos del rider no puedo confirmar?' },
  { label: 'Resumen', prompt: 'Resume lo que ya puedo responder y lo que falta.' },
  { label: 'Iluminación', prompt: '¿Qué iluminación pide el rider que no aparece en mis datos?' },
];

export const STARTER_SUGGESTIONS: HomeSuggestion[] = [
  { label: '🎸 Rock 5 pax', prompt: 'Banda de rock alternativo con 5 músicos: batería acústica, bajo, 2 guitarras, teclados y 4 mezclas in-ear.' },
  { label: '🎧 DJ Set Festival', prompt: 'DJ Set principal para festival al aire libre con setup Pioneer DJ, visuales y requerimientos de potencia.' },
  { label: '🎷 Cuarteto Jazz', prompt: 'Cuarteto de jazz acústico: piano de cola, contrabajo acústico, batería con escobillas y saxo tenor.' },
  { label: '🛡️ Seguridad Masivo', prompt: 'Protocolo de seguridad, aforos, salidas de emergencia y ambulancias para festival de 5.000 personas.' },
  { label: '🎤 Voz y coros', prompt: 'Show de voz principal con 3 coros, monitores in-ear y microfonía de mano inalámbrica.' },
  { label: '🥁 Batería acústica', prompt: 'Rider para batería acústica con overheads, microfonía de cada pieza y un drum fill.' },
  { label: '🎹 Teclados', prompt: 'Dos tecladistas con pianos de escenario, cajas directas y mezcla de monitores independiente.' },
  { label: '🎺 Vientos', prompt: 'Sección de vientos: trompeta, saxo y trombón, con microfonía y posiciones en tarima.' },
  { label: '💡 Teatro 800 pax', prompt: 'Teatro de 800 personas: PA, iluminación teatral, hospitality de camerinos y protocolo de seguridad.' },
  { label: '🏕️ Festival aire libre', prompt: 'Escenario principal de festival al aire libre: line array, potencia trifásica, rigging y aforo.' },
  { label: '🍽️ Hospitality gira', prompt: 'Hospitality de gira para 8 personas: catering, camerinos, hospedaje y traslados.' },
  { label: '🎻 Ensamble acústico', prompt: 'Ensamble acústico de cuerdas en sala: microfonía, monitores de piso y niveles de presión.' },
];

export function pickHomeSuggestions(pool: HomeSuggestion[], count = 4): HomeSuggestion[] {
  const copy = [...pool];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy.slice(0, count);
}
