"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { AgentRole, AGENT_PROFILES } from '@/lib/agents/rider-agent';

// Tipos de Rider soportados
type RiderType = 'tecnico' | 'hospitality' | 'seguridad';
type AppState = 'landing' | 'chat_prompt' | 'workspace';

interface SectionItem {
  id: string;
  num: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  iconName: string;
  content?: string;
}

interface RiderDefinition {
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  sections: SectionItem[];
}

const RIDER_DATA: Record<RiderType, RiderDefinition> = {
  tecnico: {
    title: 'Rider Técnico de Audio & Escenario',
    badge: 'Técnico & FOH',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Especificaciones acústicas, PA, microfonía, monitoreo y distribución de escenario.',
    sections: [
      {
        id: 'tech-contactos',
        num: '01',
        title: 'Info General & Contactos Clave',
        subtitle: 'FOH Engineer, Stage Manager & Crew',
        tag: 'Producción',
        tagColor: 'bg-slate-100 text-slate-700',
        iconName: 'users',
        content: '• FOH Sound Engineer: [Nombre / Teléfono / Email]\n• Monitor Engineer: [Nombre / Teléfono / Email]\n• Stage Manager & Backline: [Nombre / Teléfono / Email]\n• Director Técnico / Road Manager: [Nombre / Teléfono / Email]\n• Radios / Intercom: Canal de producción asignado en sitio.'
      },
      {
        id: 'tech-pa',
        num: '02',
        title: 'Sistema de PA & Consola FOH',
        subtitle: 'Cobertura acústica y consola de sala',
        tag: 'Acústica',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'speaker',
        content: '• Cobertura uniforme en todo el recinto (SPL continuo requerido en FOH).\n• Marcas y sistemas de PA preferidos (ej: L-Acoustics, d&b audiotechnik, Meyer Sound).\n• Consola FOH principal requerida y alternativas aceptadas.\n• Protocolo digital / Red: Dante, MADI, AES/EBU con cables redundantes.'
      },
      {
        id: 'tech-monitores',
        num: '03',
        title: 'Monitoreo & Sistema IEM',
        subtitle: 'Mezclas In-Ear, Wedges & RF',
        tag: 'RF / Audio',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'headphones',
        content: '• Mezclas estéreo In-Ear (IEM) requeridas y modelos de transmisores/receptores.\n• Cuñas de piso (Wedges) y Side-Fills de referencia.\n• Monitoreo de batería (Subwoofer / ButtKicker / IEM cableado).\n• Rango de frecuencias RF y coordinación de radiofrecuencia en sitio.'
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
        iconName: 'coffee',
        content: '• Número total de raciones (PAX) para almuerzo y cena del equipo.\n• Menú Caliente: Opciones de proteína, carbohidratos saludables y barra de ensaladas.\n• Dietas Especiales: Especificar raciones veganas, vegetarianas, celíacas (sin gluten) o alergias severas.\n• Horarios de comida coordinados con la prueba de sonido (Soundcheck).'
      },
      {
        id: 'hosp-bebidas',
        num: '03',
        title: 'Hidratación, Café & Cuidados Vocales',
        subtitle: 'Bebidas, café, infusiones & tarima',
        tag: 'Barra',
        tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
        iconName: 'wine',
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
    title: 'Rider de Seguridad & Plan de Evacuación',
    badge: 'Seguridad & Protocolo',
    badgeColor: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    description: 'Medidas perimetrales, vallas de foso, protección personal y unidades médicas.',
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

// Íconos SVG estilizados y nítidos
function Icon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  switch (name) {
    case 'lightbulb':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
    case 'plus':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case 'search':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'bell':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case 'speaker':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>;
    case 'headphones':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>;
    case 'guitar':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 5-3-3L8.5 9.5a5.5 5.5 0 1 0 7.78 7.78L23.5 10 19 5z"/><circle cx="12" cy="15" r="2"/></svg>;
    case 'users':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'list':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
    case 'map':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>;
    case 'coffee':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>;
    case 'wine':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 22h8"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9C7.5 6 7 8 7 10a5 5 0 0 0 5 5z"/></svg>;
    case 'hotel':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M6 18H4V3h16v15h-2"/><rect x="9" y="8" width="6" height="4"/><line x1="10" y1="18" x2="14" y2="18"/></svg>;
    case 'door':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="1"/></svg>;
    case 'truck':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    case 'badge':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="8.01"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>;
    case 'shield':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'barrier':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><line x1="6" y1="14" x2="6" y2="20"/><line x1="18" y1="14" x2="18" y2="20"/><line x1="6" y1="6" x2="10" y2="14"/><line x1="14" y1="6" x2="18" y2="14"/></svg>;
    case 'userCheck':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>;
    case 'lock':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case 'heartPulse':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l1.5-3 2 6.5 1.5-3.5h6.28"/></svg>;
    case 'flame':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
    case 'share':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
    case 'download':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case 'send':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    case 'sparkles':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>;
    case 'check':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
    case 'clock':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'arrowLeft':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
    case 'fileText':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
    case 'messageSquare':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'edit':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
    case 'trash':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case 'eye':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'panelRightClose':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m8 9 3 3-3 3"/></svg>;
    case 'panelRightOpen':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m10 15-3-3 3-3"/></svg>;
    case 'grip':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>;
    case 'database':
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
    default:
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
  }
}

interface SavedRider {
  id: string;
  title: string;
  artist: string;
  tour: string;
  type: RiderType;
  progress: number;
  sectionsCompleted: number;
  totalSections: number;
  status: 'completed' | 'in_progress';
  lastEdited: string;
  channels?: any[];
  sections?: any[];
}

const INITIAL_SAVED_RIDERS: SavedRider[] = [];

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [riderType, setRiderType] = useState<RiderType>('tecnico');
  const [activeSectionId, setActiveSectionId] = useState<string>('tech-contactos');
  const [userPrompt, setUserPrompt] = useState('');
  
  // Estado mutable del Rider para permitir agregar secciones dinámicas
  const [riderData, setRiderData] = useState<Record<RiderType, RiderDefinition>>(RIDER_DATA);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSecTitle, setNewSecTitle] = useState('');
  const [newSecSubtitle, setNewSecSubtitle] = useState('');
  const [newSecTag, setNewSecTag] = useState('Personalizado');
  const [newSecContent, setNewSecContent] = useState('');
  
  // Historial de riders state
  const [savedRiders, setSavedRiders] = useState<SavedRider[]>(INITIAL_SAVED_RIDERS);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Estado de secciones completadas por tipo de rider
  const [completedSectionIds, setCompletedSectionIds] = useState<Record<RiderType, string[]>>({
    tecnico: ['tech-contactos', 'tech-pa', 'tech-monitores', 'tech-inputlist'],
    hospitality: ['hosp-camerinos', 'hosp-catering', 'hosp-bebidas'],
    seguridad: ['seg-perimetro', 'seg-foso', 'seg-custodia', 'seg-emergencias']
  });

  // Estado de edición interactiva del Document Preview
  const [isEditMode, setIsEditMode] = useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [docHeaderTitle, setDocHeaderTitle] = useState('Nuevo Artista / Banda');
  const [docHeaderSeason, setDocHeaderSeason] = useState('Temporada 2026');

  // Input list dinámico e interactivo para la sección 05 (Técnico)
  const [inputListChannels, setInputListChannels] = useState<Array<{ id: string; ch: string; name: string; mic: string; stand: string }>>([
    { id: 'ch-1', ch: '01', name: 'Voz Principal (Lead Vocal)', mic: 'Shure KSM9 / SM58', stand: 'Pie Jirafa' },
    { id: 'ch-2', ch: '02', name: 'Guitarra / Instrumento Línea', mic: 'Radial J48 DI / SM57', stand: 'Atril bajo' }
  ]);

  // Modal para editar sección completa
  const [editingSection, setEditingSection] = useState<SectionItem | null>(null);

  // Conversaciones en el chat (cargadas desde Supabase)
  const [conversations, setConversations] = useState<{ id: string; title: string; date: string; active: boolean }[]>([]);
  const [activeChatTab, setActiveChatTab] = useState<'conversations' | 'riders'>('conversations');

  // Chat state & AI Agents
  const [activeAgent, setActiveAgent] = useState<AgentRole>('master');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [messages, setMessages] = useState<Array<{
    sender: 'ai' | 'user';
    text: string;
    time: string;
    role?: AgentRole;
    roleName?: string;
    roleAvatar?: string;
    notice?: string;
  }>>([
    {
      sender: 'ai',
      text: '¡Hola! Soy tu Copilot de Producción. Coordino a tus agentes especializados (Ingeniero de Audio FOH, Coordinador de Hospitality y Director de Seguridad). Pídeme agregar micrófonos a la Input List, ajustar catering o protocolos técnicos y los aplicaré en vivo.',
      time: '10:04',
      role: 'master',
      roleName: 'Master Production Copilot',
      roleAvatar: '🧠'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supabase Database Sync & Session State
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [currentRiderId, setCurrentRiderId] = useState<string>('');
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<'idle' | 'saved' | 'saving' | 'error'>('idle');

  const previewContainerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cargar riders y conversaciones reales desde la base de datos de Supabase
  useEffect(() => {
    async function loadDatabaseData() {
      // 1. Cargar Riders reales
      try {
        const res = await fetch('/api/riders');
        if (res.ok) {
          const data = await res.json();
          if (data.riders && Array.isArray(data.riders)) {
            const formatted: SavedRider[] = data.riders.map((r: any) => ({
              id: r.id,
              title: r.title,
              artist: r.artist_name,
              tour: r.metadata?.season || 'Temporada 2026',
              type: (r.rider_type as RiderType) || 'tecnico',
              progress: 100,
              sectionsCompleted: Array.isArray(r.sections) && r.sections.length > 0 ? r.sections.length : 6,
              totalSections: Array.isArray(r.sections) && r.sections.length > 0 ? r.sections.length : 6,
              status: (r.status === 'completed' ? 'completed' : 'in_progress') as any,
              lastEdited: new Date(r.updated_at || r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              channels: r.channels || [],
              sections: r.sections || []
            }));
            setSavedRiders(formatted);
          }
        }
      } catch (err) {
        console.warn('Could not load riders from DB', err);
      }

      // 2. Cargar Sesiones de Chat reales
      try {
        const resSessions = await fetch('/api/chat/sessions');
        if (resSessions.ok) {
          const sData = await resSessions.json();
          if (sData.sessions && Array.isArray(sData.sessions)) {
            const formattedSessions = sData.sessions.map((s: any, idx: number) => ({
              id: s.id,
              title: s.title || 'Consulta de Producción',
              date: new Date(s.updated_at || s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
              active: idx === 0
            }));
            setConversations(formattedSessions);
            if (formattedSessions.length > 0) {
              setCurrentSessionId(formattedSessions[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load chat sessions from DB', err);
      }
    }

    loadDatabaseData();
  }, []);

  const saveCurrentRiderToDatabase = async () => {
    setIsSavingToDb(true);
    setDbSyncStatus('saving');
    try {
      const res = await fetch('/api/riders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentRiderId.startsWith('r-') ? undefined : currentRiderId,
          title: riderData[riderType].title,
          artist_name: docHeaderTitle,
          rider_type: riderType,
          venue_name: 'Movistar Arena / Venue Principal',
          version: 'v1.0',
          status: 'draft',
          channels: inputListChannels,
          sections: riderData[riderType].sections,
          metadata: { season: docHeaderSeason }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rider?.id) {
          setCurrentRiderId(data.rider.id);
        }
        setDbSyncStatus('saved');
        showToast('✅ Rider sincronizado y guardado en Supabase');
        setTimeout(() => setDbSyncStatus('idle'), 4000);
      } else {
        setDbSyncStatus('error');
        showToast('⚠️ No se pudo guardar en Supabase (verifica credenciales en .env.local)');
      }
    } catch (err) {
      console.error(err);
      setDbSyncStatus('error');
      showToast('⚠️ Error de conexión al guardar el rider');
    } finally {
      setIsSavingToDb(false);
    }
  };

  // Helper de navegación con View Transitions API y soporte de fallback progresivo
  const navigateTo = (newState: AppState, direction: 'forward' | 'backward' = 'forward') => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      try {
        (document as any).startViewTransition({
          update: () => {
            setAppState(newState);
          },
          types: [direction]
        });
        return;
      } catch {
        try {
          (document as any).startViewTransition(() => {
            setAppState(newState);
          });
          return;
        } catch {
          // fallback si no está soportado
        }
      }
    }
    setAppState(newState);
  };

  const handleOpenHistoryRider = (rider: SavedRider) => {
    setCurrentRiderId(rider.id);
    setDocHeaderTitle(rider.artist);
    setDocHeaderSeason(rider.tour);
    handleSelectRiderType(rider.type);
    if (rider.channels && Array.isArray(rider.channels) && rider.channels.length > 0) {
      setInputListChannels(rider.channels.map((c: any) => ({
        id: c.id || `ch-${c.num || Math.random()}`,
        ch: c.num || c.ch || '01',
        name: c.source || c.name || 'Canal',
        mic: c.mic || 'Shure SM58',
        stand: c.stand || 'Standard'
      })));
    }
    showToast(`Cargando rider de "${rider.artist}"...`);
    navigateTo('workspace', 'forward');
  };

  const handleDeleteRider = async (riderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window !== 'undefined' && !window.confirm('¿Seguro que deseas eliminar este rider de la base de datos?')) return;
    try {
      const res = await fetch(`/api/riders?id=${riderId}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedRiders(prev => prev.filter(r => r.id !== riderId));
        if (currentRiderId === riderId) {
          setCurrentRiderId('');
          setDocHeaderTitle('Nuevo Artista / Banda');
        }
        showToast('🗑️ Rider eliminado de la base de datos');
      } else {
        showToast('⚠️ No se pudo eliminar el rider');
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ Error al eliminar el rider');
    }
  };

  // Switch rider type, reset active section y cambiar agente activo sugerido
  const handleSelectRiderType = (type: RiderType) => {
    setRiderType(type);
    const firstSec = riderData[type].sections[0].id;
    setActiveSectionId(firstSec);
    if (type === 'tecnico') setActiveAgent('audio_foh');
    else if (type === 'hospitality') setActiveAgent('hospitality');
    else if (type === 'seguridad') setActiveAgent('security');
  };

  const currentRider = riderData[riderType];
  const currentCompletedList = completedSectionIds[riderType] || [];
  const completedCount = currentCompletedList.length;
  const totalCount = currentRider.sections.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleSectionCompletion = (secId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedSectionIds(prev => {
      const list = prev[riderType] || [];
      const isCompleted = list.includes(secId);
      const updated = isCompleted ? list.filter(id => id !== secId) : [...list, secId];
      
      const newPercent = totalCount > 0 ? Math.round((updated.length / totalCount) * 100) : 0;
      
      // Sincronizar en tiempo real con el estado de savedRiders (historial)
      setSavedRiders(sPrev => sPrev.map(r => {
        if (r.type === riderType) {
          return {
            ...r,
            sectionsCompleted: updated.length,
            progress: newPercent,
            status: updated.length === totalCount ? 'completed' : 'in_progress'
          };
        }
        return r;
      }));

      const sectionObj = currentRider.sections.find(s => s.id === secId);
      const title = sectionObj ? sectionObj.title : 'Sección';
      if (!isCompleted) {
        showToast(`✓ "${title}" marcada como completada (${newPercent}%)`);
      } else {
        showToast(`Marcada como pendiente: "${title}"`);
      }

      return {
        ...prev,
        [riderType]: updated
      };
    });
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecTitle.trim()) return;

    const newNum = String(currentRider.sections.length + 1).padStart(2, '0');
    const newId = `custom-${Date.now()}`;
    const newSection: SectionItem = {
      id: newId,
      num: newNum,
      title: newSecTitle.trim(),
      subtitle: newSecSubtitle.trim() || 'Especificaciones adicionales requeridas',
      tag: newSecTag.trim() || 'Producción',
      tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
      iconName: 'fileText',
      content: newSecContent.trim() || 'Esta sección ha sido añadida dinámicamente al rider. Cumplimiento obligatorio según requerimientos de producción y logística del show.'
    };

    setRiderData(prev => ({
      ...prev,
      [riderType]: {
        ...prev[riderType],
        sections: [...prev[riderType].sections, newSection]
      }
    }));

    // Actualizar conteo en el historial
    setSavedRiders(prev => prev.map(r => {
      if (r.type === riderType) {
        return { ...r, totalSections: r.totalSections + 1, sectionsCompleted: r.sectionsCompleted + 1 };
      }
      return r;
    }));

    setNewSecTitle('');
    setNewSecSubtitle('');
    setNewSecTag('Personalizado');
    setNewSecContent('');
    setShowAddSectionModal(false);

    showToast(`¡Sección "${newSection.title}" agregada al rider!`);
    setTimeout(() => {
      scrollToSection(newId);
    }, 150);
  };

  // Reordenar secciones vía Drag and Drop con renumeración automática (01, 02, 03...)
  const handleReorderSections = (newSections: SectionItem[]) => {
    const renumbered = newSections.map((sec, index) => ({
      ...sec,
      num: String(index + 1).padStart(2, '0')
    }));

    setRiderData(prev => ({
      ...prev,
      [riderType]: {
        ...prev[riderType],
        sections: renumbered
      }
    }));
  };

  // Actualización rápida de cualquier campo de sección (título, subtítulo, contenido) directamente desde el Preview
  const handleUpdateSectionInline = (secId: string, fields: Partial<SectionItem>) => {
    setRiderData(prev => ({
      ...prev,
      [riderType]: {
        ...prev[riderType],
        sections: prev[riderType].sections.map(sec => 
          sec.id === secId ? { ...sec, ...fields } : sec
        )
      }
    }));
  };

  // Eliminar sección del rider
  const handleDeleteSection = (secId: string, secTitle: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la sección "${secTitle}" del rider?`)) {
      setRiderData(prev => ({
        ...prev,
        [riderType]: {
          ...prev[riderType],
          sections: prev[riderType].sections.filter(sec => sec.id !== secId)
        }
      }));
      setCompletedSectionIds(prev => ({
        ...prev,
        [riderType]: (prev[riderType] || []).filter(id => id !== secId)
      }));
      showToast(`Sección "${secTitle}" eliminada del rider`);
    }
  };

  // Guardar cambios desde el modal de edición enfocado
  const handleSaveEditedSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setRiderData(prev => ({
      ...prev,
      [riderType]: {
        ...prev[riderType],
        sections: prev[riderType].sections.map(sec => 
          sec.id === editingSection.id ? editingSection : sec
        )
      }
    }));
    showToast(`✓ Sección "${editingSection.title}" actualizada`);
    setEditingSection(null);
  };

  // Operaciones en la tabla interactiva de Input List
  const handleUpdateChannel = (chId: string, field: 'name' | 'mic' | 'stand', val: string) => {
    setInputListChannels(prev => prev.map(item => item.id === chId ? { ...item, [field]: val } : item));
  };

  const handleAddChannel = () => {
    const nextNum = String(inputListChannels.length + 1).padStart(2, '0');
    const newChan = {
      id: `ch-${Date.now()}`,
      ch: nextNum,
      name: `Instrumento ${nextNum}`,
      mic: 'Shure SM57 / Beta 58A',
      stand: 'Atril estándar'
    };
    setInputListChannels(prev => [...prev, newChan]);
    showToast(`Canal CH ${nextNum} agregado a la Input List`);
  };

  const handleDeleteChannel = (chId: string) => {
    setInputListChannels(prev => prev.filter(c => c.id !== chId));
    showToast('Canal eliminado de la Input List');
  };

  const callAgentChat = async (userText: string, currentHistory?: Array<{ sender: 'ai' | 'user'; text: string; time: string; role?: AgentRole; roleName?: string; roleAvatar?: string }>) => {
    setIsAgentThinking(true);
    try {
      const historyToUse = currentHistory || [...messages, { sender: 'user', text: userText, time: '' }];
      const apiMessages = historyToUse.map(m => ({
        role: m.sender === 'ai' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          riderType,
          activeAgent,
          sessionId: currentSessionId,
          riderId: currentRiderId
        })
      });

      if (!res.ok) throw new Error('Error al conectar con el servidor de agentes');
      const data = await res.json();
      if (data.sessionId && data.sessionId !== currentSessionId) {
        setCurrentSessionId(data.sessionId);
      }
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.message,
          time: now,
          role: data.role,
          roleName: data.roleName,
          roleAvatar: data.roleAvatar,
          notice: data.notice
        }
      ]);

      // Ejecución de acciones generadas por el agente sobre el documento
      if (data.actions && Array.isArray(data.actions)) {
        data.actions.forEach((act: any) => {
          if (act.type === 'add_input_channel' && act.payload) {
            const nextNum = String(inputListChannels.length + 1).padStart(2, '0');
            const newChan = {
              id: `ch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              ch: act.payload.ch || nextNum,
              name: act.payload.source || act.payload.name || `Canal ${nextNum}`,
              mic: act.payload.transducer || act.payload.mic || 'Shure Axient KSM9',
              stand: act.payload.stand || 'Pie Jirafa K&M'
            };
            setInputListChannels(cPrev => [...cPrev, newChan]);
            showToast(`✨ ${data.roleName || 'Agente'}: Canal agregado a la Input List`);
            setTimeout(() => scrollToSection('tech-inputlist'), 300);
          } else if (act.type === 'switch_rider_type' && act.payload) {
            handleSelectRiderType(act.payload);
            showToast(`✨ Cambiado a Rider ${act.payload.toUpperCase()}`);
          } else if (act.type === 'update_section' && act.payload) {
            showToast(`✨ ${data.roleName || 'Agente'}: Especificación actualizada en el rider`);
          }
        });
      }
    } catch (err) {
      console.error(err);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Hubo una dificultad de conexión con el agente. He guardado tu mensaje para el próximo intento.',
          time: now
        }
      ]);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleStartChatFromLanding = (e: React.FormEvent) => {
    e.preventDefault();
    if (userPrompt.trim()) {
      const userText = userPrompt.trim();
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const initialUserMsg = { sender: 'user' as const, text: userText, time: now };
      setMessages([initialUserMsg]);
      const newConv = {
        id: `c-${Date.now()}`,
        title: userText.length > 28 ? `${userText.slice(0, 28)}...` : userText,
        date: 'Ahora',
        active: true
      };
      setConversations(prev => [newConv, ...prev.map(c => ({ ...c, active: false }))]);
      setUserPrompt('');
      navigateTo('chat_prompt', 'forward');
      callAgentChat(userText, [initialUserMsg]);
    }
  };

  const handleNewConversation = () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newId = `c-${Date.now()}`;
    setConversations(prev => [
      { id: newId, title: 'Nueva Conversación', date: 'Ahora', active: true },
      ...prev.map(c => ({ ...c, active: false }))
    ]);
    setMessages([
      {
        sender: 'ai',
        text: '¡Hola! He abierto una nueva sesión. ¿Qué especificaciones o cambios necesitas planificar hoy?',
        time: now,
        role: 'master',
        roleName: 'Master Production Copilot',
        roleAvatar: '🧠'
      }
    ]);
    showToast('Nueva conversación creada');
  };

  const handleSelectConversation = async (convId: string) => {
    setConversations(prev => prev.map(c => ({ ...c, active: c.id === convId })));
    setCurrentSessionId(convId);
    const target = conversations.find(c => c.id === convId);
    showToast(`Cargando chat: "${target?.title || 'Conversación'}"`);
    try {
      const res = await fetch(`/api/chat/history?sessionId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          const formatted = data.messages.map((m: any) => ({
            sender: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            role: m.agent_role || 'master',
            roleName: m.role_name || 'Agente de Producción',
            roleAvatar: m.role_avatar || '🧠'
          }));
          setMessages(formatted);
        }
      }
    } catch (err) {
      console.warn('Error loading conversation history', err);
    }
  };

  const handleOpenConversationFromLanding = (convId: string) => {
    handleSelectConversation(convId);
    navigateTo('chat_prompt', 'forward');
  };

  const handleSelectSuggestion = (type: RiderType) => {
    // Iniciar rider en blanco desde cero para el tipo seleccionado
    setCurrentRiderId('');
    setDocHeaderTitle('Nuevo Artista / Banda');
    setDocHeaderSeason('Temporada 2026');
    setRiderType(type);

    if (type === 'tecnico') {
      setInputListChannels([
        { id: `ch-${Date.now()}-1`, ch: '01', name: 'Voz Principal (Lead Vocal)', mic: 'Shure KSM9 / SM58', stand: 'Pie Jirafa' },
        { id: `ch-${Date.now()}-2`, ch: '02', name: 'Guitarra / Instrumento Línea', mic: 'Radial J48 DI / SM57', stand: 'Atril bajo' }
      ]);
    } else {
      setInputListChannels([]);
    }

    setCompletedSectionIds({
      tecnico: [],
      hospitality: [],
      seguridad: []
    });

    setRiderData(RIDER_DATA);
    const firstSec = RIDER_DATA[type].sections[0].id;
    setActiveSectionId(firstSec);
    if (type === 'tecnico') setActiveAgent('audio_foh');
    else if (type === 'hospitality') setActiveAgent('hospitality');
    else if (type === 'seguridad') setActiveAgent('security');

    showToast(`✨ Plantilla en blanco de Rider ${type.toUpperCase()} lista para editar`);
    navigateTo('workspace', 'forward');
  };

  const handleCreateNewRider = (type: RiderType = 'tecnico') => {
    handleSelectSuggestion(type);
  };

  const handleConfirmStartRider = () => {
    if (userPrompt.trim()) {
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: userPrompt, time: '10:05' },
        { 
          sender: 'ai', 
          text: `Entendido. He inicializado tu ${RIDER_DATA[riderType].title}. Ya tienes configuradas las secciones reglamentarias.`, 
          time: '10:05',
          role: activeAgent,
          roleName: AGENT_PROFILES[activeAgent].name,
          roleAvatar: activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠'
        }
      ]);
    }
    navigateTo('workspace', 'forward');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAgentThinking) return;
    const userText = chatInput.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: userText, time: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setChatInput('');
    callAgentChat(userText, updatedMessages);
  };

  const handleSendPromptDirectly = (promptText: string) => {
    if (isAgentThinking) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: promptText, time: now };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    callAgentChat(promptText, updatedMessages);
  };

  const scrollToSection = (secId: string) => {
    setActiveSectionId(secId);
    const element = document.getElementById(secId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  return (
    <div className={`bg-[#f8f9fa] text-zinc-900 flex flex-col font-sans select-none antialiased ${
      appState === 'workspace' || appState === 'chat_prompt' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
    }`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm animate-bounce font-medium">
          <Icon name="sparkles" className="w-4 h-4 text-zinc-300" />
          {toastMessage}
        </div>
      )}

      {/* Global Top Header Bar (Estilo 'pio.' de la Imagen 5) */}
      <header className="h-16 px-6 sm:px-10 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => navigateTo('landing', 'backward')}
            className="flex items-center gap-2.5 cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-500/25 group-hover:scale-105 transition-transform shrink-0 ring-2 ring-white/80">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4.5H12.5C14.9853 4.5 17 6.51472 17 9C17 11.4853 14.9853 13.5 12.5 13.5H6V4.5Z" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 13.5V19.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"/>
                <path d="M12 13.5L17.5 19.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="18.5" cy="5.5" r="2" fill="#F59E0B" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1">
                <span className="font-black text-lg tracking-tight text-slate-900">Rider</span>
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent font-bold">Studio</span>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 ml-0.5 animate-pulse" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                Stage & Production Intelligence
              </span>
            </div>
          </div>

          {(appState === 'workspace' || appState === 'chat_prompt') && (
            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
              <button
                onClick={() => navigateTo('landing', 'backward')}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded-full hover:bg-slate-100 transition-all active:scale-95"
              >
                <Icon name="arrowLeft" className="w-3.5 h-3.5" /> Volver al Inicio
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Rider Type Selector Pills in Header */}
          {appState === 'workspace' && (
            <div className="hidden lg:flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/60 mr-2">
              {(['tecnico', 'hospitality', 'seguridad'] as RiderType[]).map((type) => {
                const active = riderType === type;
                const titles = { tecnico: 'Técnico', hospitality: 'Hospitality', seguridad: 'Seguridad' };
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectRiderType(type)}
                    className={`relative px-3.5 py-1 rounded-full text-xs font-semibold transition-colors duration-200 ${
                      active
                        ? 'text-slate-900'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeRiderTab"
                        className="absolute inset-0 bg-white rounded-full shadow-sm"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{titles[type]}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search pill similar to Image 5 */}
          <div className="hidden sm:flex items-center bg-slate-100/70 border border-slate-200/80 rounded-full px-3.5 py-1.5 text-xs text-slate-400 gap-2 w-44">
            <Icon name="search" className="w-3.5 h-3.5 text-slate-400" />
            <span>Buscar sección...</span>
          </div>

          {/* Bell Icon Pill */}
          <button className="w-9 h-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:shadow-sm transition-all">
            <Icon name="bell" className="w-4 h-4" />
          </button>

          {/* User Avatar Chip */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white">
              NS
            </div>
          </div>
        </div>
      </header>

      {/* AnimatePresence para transición de morfismo y escala entre pantallas */}
      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* 1. PANTALLA: LANDING (Buscador central + 3 recomendaciones + Historial) */}
        {/* ========================================================= */}
        {appState === 'landing' && (
          <motion.main 
            key="landing"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col items-center justify-start p-4 sm:p-8 lg:p-10 relative overflow-y-auto"
          >
          
          {/* Fondo suave con auras difusas (Liquid Glass ambiance) */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-200/30 rounded-full blur-3xl pointer-events-none animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none animate-float-slow [animation-delay:3s]" />
          <div className="absolute top-1/2 right-1/3 w-80 h-80 bg-amber-100/30 rounded-full blur-3xl pointer-events-none animate-float-slow [animation-delay:6s]" />

          <div className="w-full max-w-4xl flex flex-col items-center gap-8 relative z-10 py-2 sm:py-4 animate-fade-in">
            
            {/* Header Hero */}
            <div className="text-center space-y-2 animate-fade-in-down">
              <div className="inline-flex items-center gap-2 bg-violet-50 text-zinc-800 border border-violet-100 px-3.5 py-1 rounded-full text-xs font-semibold shadow-xs">
                <Icon name="sparkles" className="w-3.5 h-3.5 text-violet-500" />
                <span>Generador Inteligente de Riders Profesionales</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                ¿Qué rider necesitas preparar hoy?
              </h1>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Inicia una conversación con el agente o selecciona una plantilla oficial para editar en 3 paneles.
              </p>
            </div>

            {/* Input Principal Grande con '+' (Wireframe 1) */}
            <form 
              onSubmit={handleStartChatFromLanding}
              className="w-full bg-white/95 backdrop-blur-xl rounded-full p-2.5 sm:p-3 shadow-[0_12px_40px_-8px_rgba(100,116,139,0.12)] border border-white hover:border-zinc-200 transition-all duration-300 flex items-center gap-3 animate-scale-up"
            >
              <button 
                type="button" 
                className="w-11 h-11 rounded-full bg-slate-100 hover:bg-zinc-100 text-slate-500 hover:text-zinc-900 flex items-center justify-center transition-all shrink-0"
              >
                <Icon name="plus" className="w-5 h-5" />
              </button>
              
              <input 
                type="text" 
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Escribe lo que necesitas (ej. 'Quiero un rider técnico para banda de rock de 5 personas')..."
                className="flex-1 bg-transparent text-sm sm:text-base outline-none text-slate-800 placeholder-slate-400 font-medium"
              />

              <button 
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md shadow-violet-600/25 transition-all shrink-0 flex items-center gap-2 active:scale-95"
              >
                <span>Chatear</span>
                <Icon name="send" className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Recomendaciones en Píldoras en una sola fila (Wireframe 1) */}
            <div className="flex flex-col items-center gap-3 w-full animate-fade-in-up [animation-delay:120ms]">
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase text-center">
                O salta directo al workspace con una plantilla:
              </span>

              <div className="w-full flex items-center justify-center gap-2.5 sm:gap-4 flex-nowrap overflow-x-auto py-1">
                
                {/* 1. Hospitality */}
                <button
                  onClick={() => handleSelectSuggestion('hospitality')}
                  className="group bg-white/95 hover:bg-white px-4 sm:px-5 py-2.5 rounded-full border border-slate-200/80 hover:border-sky-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95"
                >
                  <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="coffee" className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">Rider Hospitality</span>
                </button>

                {/* 2. Técnico */}
                <button
                  onClick={() => handleSelectSuggestion('tecnico')}
                  className="group bg-white/95 hover:bg-white px-4 sm:px-5 py-2.5 rounded-full border border-slate-200/80 hover:border-zinc-400 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95"
                >
                  <div className="w-6 h-6 rounded-full bg-violet-50 text-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="speaker" className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">Rider Técnico</span>
                </button>

                {/* 3. Seguridad */}
                <button
                  onClick={() => handleSelectSuggestion('seguridad')}
                  className="group bg-white/95 hover:bg-white px-4 sm:px-5 py-2.5 rounded-full border border-slate-200/80 hover:border-amber-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 shrink-0 whitespace-nowrap active:scale-95"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon name="shield" className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">Rider Seguridad</span>
                </button>

              </div>
            </div>

            {/* MINI HISTORIAL DE CHATS (Acceso Rápido a Conversaciones y al Asistente) */}
            <div className="w-full pt-2 animate-fade-in-up [animation-delay:180ms]">
              <div className="bg-white/80 backdrop-blur-md rounded-[26px] p-4 sm:p-5 border border-white shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)] space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-violet-100 text-zinc-800 flex items-center justify-center font-bold">
                      <Icon name="messageSquare" className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Conversaciones Recientes</span>
                        <span className="bg-violet-100 text-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {conversations.length}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">Accede a tus sesiones con el asistente de IA</p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigateTo('chat_prompt', 'forward')}
                    className="group bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm shadow-violet-600/25 flex items-center gap-1.5 active:scale-95"
                  >
                    <span>Ir al Chat</span>
                    <Icon name="arrowLeft" className="w-3 h-3 rotate-180 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Grid o lista horizontal de chats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {conversations.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-slate-400 text-xs bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                      No hay conversaciones guardadas en la base de datos aún. ¡Inicia una en el chat!
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <motion.button
                        key={conv.id}
                        onClick={() => handleOpenConversationFromLanding(conv.id)}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="text-left p-3 rounded-2xl bg-slate-50/70 hover:bg-zinc-100/50 border border-slate-100 hover:border-zinc-200 transition-all flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 group-hover:border-zinc-200 text-slate-500 group-hover:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-all">
                          <Icon name="messageSquare" className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-violet-900 truncate">
                            {conv.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-0.5">
                            <span>{conv.date}</span>
                            <span>•</span>
                            <span className="text-zinc-900 font-bold group-hover:underline">Reanudar ↗</span>
                          </div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN DE HISTORIAL DE RIDERS (HECHOS O EN PROGRESO) */}
            <div className="w-full pt-4 space-y-4 animate-fade-in-up [animation-delay:220ms]">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 border-t border-slate-200/70 pt-8">
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Tus Riders Recientes</span>
                    <span className="bg-slate-200/70 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {savedRiders.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Continúa editando o consulta documentos finalizados
                  </p>
                </div>

                {/* Filtro de estado */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200/60">
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      historyFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setHistoryFilter('in_progress')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      historyFilter === 'in_progress'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    En Progreso
                  </button>
                  <button
                    onClick={() => setHistoryFilter('completed')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      historyFilter === 'completed'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Completados
                  </button>
                </div>
              </div>

              {/* Grid de Tarjetas de Riders (Estilo Imagen 5) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {savedRiders.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 text-sm bg-white/70 rounded-3xl border border-dashed border-slate-200">
                    No tienes riders guardados en la base de datos aún. Crea o guarda uno desde el Workspace.
                  </div>
                ) : (
                  savedRiders
                    .filter(r => {
                      if (historyFilter === 'in_progress') return r.status === 'in_progress';
                      if (historyFilter === 'completed') return r.status === 'completed';
                      return true;
                    })
                    .map((rider) => {
                    const typeDef = RIDER_DATA[rider.type];
                    return (
                      <motion.div
                        layout
                        key={rider.id}
                        onClick={() => handleOpenHistoryRider(rider)}
                        whileHover={{ scale: 1.025, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        className="group bg-white/95 hover:bg-white rounded-[26px] p-5 shadow-[0_10px_30px_-8px_rgba(100,116,139,0.06)] hover:shadow-[0_16px_40px_-10px_rgba(100,116,139,0.12)] border border-slate-100 hover:border-zinc-200/80 transition-colors cursor-pointer flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Fila superior: Tipo y Estado */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeDef.badgeColor}`}>
                              {typeDef.badge}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {rider.status === 'completed' ? (
                                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  <Icon name="check" className="w-3 h-3 text-emerald-600" />
                                  <span>Finalizado</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span>En Progreso</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRider(rider.id, e)}
                                className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar rider de la base de datos"
                              >
                                <Icon name="trash" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Título y Artista */}
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-zinc-800 transition-colors tracking-tight line-clamp-1">
                              {rider.artist}
                            </h4>
                            <p className="text-xs font-semibold text-slate-500 line-clamp-1">
                              {rider.tour}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                              {rider.title}
                            </p>
                          </div>
                        </div>

                        {/* Barra de Progreso y Fecha */}
                        <div className="pt-4 mt-3 border-t border-slate-100/80 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-400 font-medium">Progreso</span>
                            <span className={rider.status === 'completed' ? 'text-emerald-600' : 'text-violet-600'}>
                              {rider.sectionsCompleted}/{rider.totalSections} Secciones ({rider.progress}%)
                            </span>
                          </div>

                          {/* Barra de progreso */}
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rider.status === 'completed'
                                  ? 'bg-emerald-500'
                                  : 'bg-violet-600'
                              }`}
                              style={{ width: `${rider.progress}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
                            <span className="flex items-center gap-1">
                              <Icon name="clock" className="w-3 h-3" />
                              {rider.lastEdited}
                            </span>
                            <span className="text-zinc-900 font-bold group-hover:underline">
                              Abrir ↗
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </motion.main>
      )}

      {/* ========================================================= */}
      {/* 2. PANTALLA: CHAT CON EL AGENTE (Arquitectura de 2 Paneles)*/}
      {/* ========================================================= */}
      {appState === 'chat_prompt' && (
        <motion.main 
          key="chat_prompt"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-4 lg:p-5 gap-2.5 sm:gap-3"
        >
          {/* Subheader Informativo (Mismo estilo exacto que el workspace) */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-1 animate-fade-in-down flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Asistente de Producción & Riders
              </h2>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-700">Claude 3.5 Sonnet Sincronizado</span>
                <span className="text-slate-300">•</span>
                <span>Guardado en Vivo</span>
              </div>
            </div>
          </div>

          {/* Grid de 2 Paneles (Misma estructura de 12 columnas que el workspace) */}
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 lg:gap-4 overflow-hidden">
            
            {/* ---------------------------------------------------- */}
            {/* PANEL IZQUIERDO (25% - col-span-3): Historial & Riders */}
            {/* ---------------------------------------------------- */}
            <section className="col-span-3 h-full min-h-0 bg-white/95 backdrop-blur-xl rounded-[26px] p-4 shadow-xs border border-white flex flex-col justify-between overflow-hidden animate-slide-in-left">
              
              <div className="flex flex-col min-h-0 space-y-3">
                {/* Header del Panel Izquierdo */}
                <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Historial & Riders</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Sesiones y avances</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleNewConversation}
                      className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200/80 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95"
                      title="Nueva conversación"
                    >
                      <Icon name="plus" className="w-3 h-3 text-zinc-900" />
                      <span>Nueva</span>
                    </button>
                  </div>
                </div>

                {/* Tabs de Selección: Chats vs Riders */}
                <div className="shrink-0 flex items-center bg-slate-100/90 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setActiveChatTab('conversations')}
                    className={`flex-1 py-1 rounded-lg transition-all text-xs ${
                      activeChatTab === 'conversations'
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Chats ({conversations.length})
                  </button>
                  <button
                    onClick={() => setActiveChatTab('riders')}
                    className={`flex-1 py-1 rounded-lg transition-all text-xs ${
                      activeChatTab === 'riders'
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Riders ({savedRiders.length})
                  </button>
                </div>

                {/* Lista Scrolleable */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 pt-1">
                  {/* Vista 1: Conversaciones */}
                  {activeChatTab === 'conversations' && (
                    <div className="space-y-1.5">
                      {conversations.length === 0 ? (
                        <div className="py-8 px-2 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          Sin conversaciones en la base de datos
                        </div>
                      ) : (
                        conversations.map((conv) => (
                          <motion.button
                            layout
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv.id)}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center gap-3 border ${
                              conv.active
                                ? 'bg-violet-50/80 border-zinc-200 shadow-xs text-zinc-900 font-extrabold font-bold'
                                : 'bg-slate-50/60 hover:bg-slate-50 border-slate-100 text-slate-700'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              conv.active ? 'bg-zinc-900 text-white shadow-xs' : 'bg-white text-slate-500 shadow-2xs'
                            }`}>
                              <Icon name="messageSquare" className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{conv.title}</p>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{conv.date}</span>
                            </div>
                          </motion.button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Vista 2: Riders en Progreso / Completados */}
                  {activeChatTab === 'riders' && (
                    <div className="space-y-2">
                      {savedRiders.length === 0 ? (
                        <div className="py-8 px-2 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          Sin riders en la base de datos
                        </div>
                      ) : (
                        savedRiders.map((rider) => {
                        const typeDef = RIDER_DATA[rider.type];
                        return (
                          <motion.div
                            layout
                            key={rider.id}
                            onClick={() => handleOpenHistoryRider(rider)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-3 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-100 hover:border-zinc-200 shadow-2xs cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${typeDef.badgeColor}`}>
                                {typeDef.badge}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black ${rider.status === 'completed' ? 'text-emerald-600' : 'text-violet-600'}`}>
                                  {rider.progress}%
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteRider(rider.id, e)}
                                  className="p-0.5 text-slate-300 hover:text-rose-600 rounded transition-colors"
                                  title="Eliminar rider de la base de datos"
                                >
                                  <Icon name="trash" className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs font-bold text-slate-900 truncate">{rider.artist}</p>
                            <p className="text-[10px] text-slate-400 truncate">{rider.title}</p>

                            <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${rider.status === 'completed' ? 'bg-emerald-500' : 'bg-violet-600'}`}
                                style={{ width: `${rider.progress}%` }}
                              />
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                  )}
                </div>
              </div>

              {/* Botón Inferior: Ir al Editor de 3 Paneles */}
              <div className="shrink-0 pt-3 border-t border-slate-100 mt-2">
                <button
                  onClick={() => navigateTo('workspace', 'forward')}
                  className="w-full bg-zinc-900 hover:bg-zinc-700 text-white p-2.5 rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 group"
                >
                  <Icon name="list" className="w-4 h-4 text-slate-300 group-hover:text-white" />
                  <span>Abrir Editor (3 Paneles)</span>
                  <Icon name="arrowLeft" className="w-3.5 h-3.5 rotate-180 ml-auto" />
                </button>
              </div>

            </section>

            {/* ---------------------------------------------------- */}
            {/* PANEL DERECHO (75% - col-span-9): Chat Grande Ocupando el Resto */}
            {/* ---------------------------------------------------- */}
            <section className="col-span-9 h-full min-h-0 bg-white rounded-[26px] shadow-xs border border-slate-100 flex flex-col overflow-hidden animate-scale-up [animation-delay:60ms]">
              
              {/* Barra Superior del Chat (Document Toolbar style) */}
              <div className="shrink-0 px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                      {AGENT_PROFILES[activeAgent]?.name || 'Agente de Producción'}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        {AGENT_PROFILES[activeAgent]?.title || 'Asistente de Riders'} • Vercel Gateway
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-semibold hidden sm:inline-block">
                    Modo Multi-Agente
                  </span>
                  <button
                    onClick={() => navigateTo('workspace', 'forward')}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <span>Ver Documento</span>
                    <Icon name="arrowLeft" className="w-3 h-3 rotate-180" />
                  </button>
                </div>
              </div>

              {/* Selector Rápido de Agentes Especializados */}
              <div className="shrink-0 px-6 py-2 bg-slate-50/40 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Agente Activo:
                </span>
                {(['master', 'audio_foh', 'hospitality', 'security'] as AgentRole[]).map((role) => {
                  const isActive = activeAgent === role;
                  const icons = { master: '🧠', audio_foh: '🎛️', hospitality: '☕', security: '🛡️' };
                  const labels = { master: 'Master Copilot', audio_foh: 'Audio & FOH', hospitality: 'Hospitality', security: 'Seguridad' };
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setActiveAgent(role);
                        showToast(`Agente activado: ${AGENT_PROFILES[role].name}`);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 ${
                        isActive
                          ? 'bg-zinc-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                      }`}
                    >
                      <span>{icons[role]}</span>
                      <span>{labels[role]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Historial de Mensajes del Chat */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 bg-white">
                {messages.map((m, idx) => (
                  <div 
                    key={idx}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'} animate-message-appear`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    {m.sender === 'ai' && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs">{m.roleAvatar || '🧠'}</span>
                        <span className="text-[11px] font-bold text-slate-700">{m.roleName || 'Agente de Producción'}</span>
                      </div>
                    )}
                    <div className={`p-4 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-xs transition-all ${
                      m.sender === 'user'
                        ? 'bg-violet-600 text-white rounded-tr-xs'
                        : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-xs'
                    }`}>
                      {m.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-semibold px-1">
                      {m.time}
                    </span>
                  </div>
                ))}

                {/* Indicador de pensamiento del agente */}
                {isAgentThinking && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-violet-50/80 border border-violet-100 text-violet-700 text-xs font-semibold animate-pulse w-fit">
                    <span className="w-2 h-2 rounded-full bg-violet-600 animate-ping" />
                    <span>{AGENT_PROFILES[activeAgent]?.name || 'Agente'} está analizando y sincronizando el rider...</span>
                  </div>
                )}
              </div>

              {/* Chips de Preguntas Sugeridas */}
              <div className="shrink-0 px-6 py-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 bg-slate-50/50">
                <button 
                  onClick={() => handleSendPromptDirectly('Es un formato acústico de 3 músicos')}
                  className="text-xs bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200/70 px-3 py-1.5 rounded-full transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  + Formato acústico (3 músicos)
                </button>
                <button 
                  onClick={() => handleSendPromptDirectly('Banda completa de rock con batería y 2 amplis')}
                  className="text-xs bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200/70 px-3 py-1.5 rounded-full transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  + Banda completa de rock
                </button>
                <button 
                  onClick={() => handleSendPromptDirectly('Agrega requerimiento de 4 máquinas de chispa fría y CO2')}
                  className="text-xs bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200/70 px-3 py-1.5 rounded-full transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  + Efectos y Pirotecnia
                </button>
              </div>

              {/* Input Activo de Chat */}
              <form onSubmit={handleSendMessage} className="shrink-0 p-4 border-t border-slate-100 bg-white flex items-center gap-3">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu mensaje o detalla lo que necesitas..."
                  className="flex-1 bg-slate-50 border border-slate-200/80 rounded-full px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                />
                <button
                  type="submit"
                  className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all shrink-0 shadow-sm shadow-violet-600/25 active:scale-95"
                >
                  <Icon name="send" className="w-4 h-4" />
                </button>
              </form>

            </section>

          </div>
        </motion.main>
      )}

      {/* ========================================================= */}
      {/* 3. PANTALLA: WORKSPACE 3 PANELES (Wireframe 3 + Estilo Imagen 5) */}
      {/* ========================================================= */}
      {appState === 'workspace' && (
        <motion.main 
          key="workspace"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-h-0 overflow-hidden flex flex-col p-3 sm:p-4 lg:p-5 gap-2.5 sm:gap-3"
        >
          
          {/* Subheader Informativo del Rider Activo */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-1 animate-fade-in-down">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${currentRider.badgeColor}`}>
                {currentRider.badge}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {currentRider.title}
              </h2>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-700">{currentRider.sections.length} Secciones Sincronizadas</span>
                <span className="text-slate-300">•</span>
                <span>Guardado en Vivo</span>
              </div>
            </div>
          </div>

          {/* Grid de los 3 Paneles */}
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 lg:gap-4 overflow-hidden">
            
            {/* ---------------------------------------------------- */}
            {/* PANEL IZQUIERDO (25%): Índice de Secciones del Rider */}
            {/* ---------------------------------------------------- */}
            <section className="col-span-3 h-full min-h-0 bg-white/95 backdrop-blur-xl rounded-[26px] p-4 shadow-xs border border-white flex flex-col overflow-hidden animate-slide-in-left">
              
              <div className="shrink-0 pb-2.5 border-b border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Estructura del Rider</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Navega o añade secciones</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold">
                      {completedCount}/{currentRider.sections.length}
                    </span>
                  </div>
                </div>

                {/* Mini barra de progreso en el panel izquierdo */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${progressPercent === 100 ? 'bg-emerald-500' : 'bg-violet-600'}`}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>
              </div>

              {/* Lista Vertical de Secciones con Drag and Drop (Reorder) */}
              <div className="flex-1 min-h-0 overflow-y-auto py-2 pr-1">
                <Reorder.Group 
                  axis="y" 
                  values={currentRider.sections} 
                  onReorder={handleReorderSections}
                  className="space-y-2"
                >
                  {currentRider.sections.map((sec) => {
                    const isActive = activeSectionId === sec.id;
                    const isDone = currentCompletedList.includes(sec.id);
                    return (
                      <Reorder.Item
                        key={sec.id}
                        value={sec}
                        whileDrag={{ 
                          scale: 1.03, 
                          boxShadow: "0 12px 28px -6px rgba(124, 58, 237, 0.25)",
                          zIndex: 50
                        }}
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        className={`w-full text-left p-2.5 rounded-2xl transition-colors flex items-center gap-2 border select-none cursor-grab active:cursor-grabbing ${
                          isActive
                            ? 'bg-zinc-100/90 border-zinc-300 shadow-2xs'
                            : isDone
                            ? 'bg-emerald-50/30 hover:bg-emerald-50/50 border-emerald-100/60'
                            : 'bg-slate-50/70 hover:bg-slate-50 border-slate-100'
                        }`}
                      >
                        {/* Grip Handle para arrastrar */}
                        <div 
                          className="shrink-0 text-slate-300 hover:text-zinc-900 transition-colors p-0.5 cursor-grab active:cursor-grabbing"
                          title="Arrastra para reordenar"
                        >
                          <Icon name="grip" className="w-3.5 h-3.5" />
                        </div>

                        {/* Checkbox / Badge Interactivo de Finalización */}
                        <button
                          type="button"
                          onClick={(e) => toggleSectionCompletion(sec.id, e)}
                          title={isDone ? "Marcar como pendiente" : "Marcar sección como completada"}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-extrabold text-[11px] shrink-0 transition-all active:scale-90 ${
                            isDone
                              ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600 ring-2 ring-emerald-200'
                              : isActive
                              ? 'bg-zinc-900 text-white shadow-xs'
                              : 'bg-white text-slate-500 shadow-2xs hover:border-slate-300'
                          }`}
                        >
                          {isDone ? (
                            <Icon name="check" className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            sec.num
                          )}
                        </button>

                        <div 
                          onClick={() => scrollToSection(sec.id)}
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-xs font-bold truncate ${
                              isDone 
                                ? 'text-slate-600 line-through decoration-emerald-500/60' 
                                : isActive 
                                ? 'text-zinc-900 font-extrabold' 
                                : 'text-slate-800'
                            }`}>
                              {sec.title}
                            </span>
                            {isDone && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
                                Listo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-medium truncate text-slate-400">
                            {sec.subtitle}
                          </p>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>

                {/* Botón interactivo al final de la lista para agregar sección */}
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-zinc-400 hover:bg-zinc-100/50 text-slate-500 hover:text-zinc-800 text-xs font-bold transition-all flex items-center justify-center gap-2 group active:scale-98 mt-1"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-violet-100 text-slate-500 group-hover:text-zinc-900 flex items-center justify-center transition-colors">
                    <Icon name="plus" className="w-3.5 h-3.5" />
                  </div>
                  <span>+ Agregar Nueva Sección</span>
                </button>
              </div>

              {/* Mini Widget Informativo y Toggle Chat al fondo del Panel Izquierdo */}
              <div className="shrink-0 mt-auto pt-3 border-t border-slate-100 space-y-2">
                <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center shrink-0">
                      <Icon name="sparkles" className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-800 block">Modo IA Asistido</span>
                      <span className="text-[10px] text-slate-400 block">Sincronizado en tiempo real</span>
                    </div>
                  </div>
                  {!isChatCollapsed && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsChatCollapsed(true);
                        showToast('Chat ocultado. Documento a pantalla completa.');
                      }}
                      className="text-[10px] bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 px-2 py-1 rounded-xl font-bold transition-all shadow-2xs hover:text-slate-900 shrink-0"
                      title="Ocultar chat"
                    >
                      Ocultar
                    </button>
                  )}
                </div>
              </div>

            </section>

            {/* ---------------------------------------------------- */}
            {/* PANEL CENTRAL: Preview Estético del Documento */}
            {/* ---------------------------------------------------- */}
            <section 
              ref={previewContainerRef}
              className={`${
                isChatCollapsed ? 'col-span-9' : 'col-span-6'
              } h-full min-h-0 bg-white rounded-[26px] shadow-xs border border-slate-100 flex flex-col overflow-hidden transition-all duration-300 animate-scale-up [animation-delay:60ms]`}
            >
              
              {/* Barra Superior del Preview (Document Toolbar con Modo Edición & Acciones) */}
              <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-wrap gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-bold text-slate-500 ml-1">DOCUMENT PREVIEW</span>
                  
                  {/* Toggle Switch Estilo Apple / iOS: Lectura vs Edición */}
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEditMode}
                      onClick={() => {
                        setIsEditMode(!isEditMode);
                        showToast(!isEditMode ? '✏️ Modo edición activado' : '📖 Modo lectura activado');
                      }}
                      className="group flex items-center gap-2 cursor-pointer focus:outline-none"
                      title={isEditMode ? "Cambiar a Modo Lectura" : "Cambiar a Modo Edición"}
                    >
                      <span className="text-[11px] font-bold text-slate-500 select-none hidden sm:inline">
                        {isEditMode ? 'Edición' : 'Lectura'}
                      </span>
                      <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
                        isEditMode ? 'bg-violet-600' : 'bg-zinc-200 group-hover:bg-zinc-300'
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out flex items-center justify-center ${
                          isEditMode ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                          <Icon 
                            name={isEditMode ? "edit" : "eye"} 
                            className={`w-2.5 h-2.5 ${isEditMode ? 'text-violet-600' : 'text-zinc-400'}`} 
                          />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Botones de Acción Superiores: Compartir & Descargar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveCurrentRiderToDatabase}
                    disabled={isSavingToDb}
                    className={`${
                      dbSyncStatus === 'saved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : dbSyncStatus === 'saving'
                        ? 'bg-slate-100 text-slate-500 border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                    } border px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-60`}
                    title="Guardar y sincronizar rider en Supabase"
                  >
                    <Icon name="database" className={`w-3.5 h-3.5 ${dbSyncStatus === 'saved' ? 'text-emerald-600' : ''}`} />
                    <span className="hidden sm:inline">
                      {dbSyncStatus === 'saving' ? 'Guardando...' : dbSyncStatus === 'saved' ? 'Guardado en BD ✓' : 'Guardar en BD'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                      }
                      showToast('¡Enlace de Rider copiado al portapapeles!');
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-3 py-1.5 rounded-full text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                    title="Copiar enlace del rider"
                  >
                    <Icon name="share" className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Compartir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      showToast('Generando y descargando PDF oficial...');
                    }}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs shadow-violet-600/20 transition-all flex items-center gap-1.5 active:scale-95"
                    title="Descargar documento en PDF"
                  >
                    <Icon name="download" className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Descargar PDF</span>
                  </button>
                </div>
              </div>

              {/* Contenido Renderizado del Documento (Scrollable) con Transición de Morfismo y Escala */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={riderType}
                  initial={{ opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 space-y-8 bg-[#ffffff] overscroll-contain"
                >
                
                {/* Portada / Encabezado Oficial del Rider (Con soporte de edición inline) */}
                <div className="border-b-2 border-slate-900 pb-5 space-y-2 group relative">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black tracking-widest text-zinc-500 uppercase">
                      OFFICIAL TOURING CONTRACT SPECIFICATION
                    </span>
                    {isEditMode ? (
                      <input 
                        type="text"
                        value={docHeaderSeason}
                        onChange={(e) => setDocHeaderSeason(e.target.value)}
                        className="text-xs text-slate-500 font-semibold bg-transparent hover:bg-slate-50 focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-zinc-800 outline-none px-1 rounded transition-colors text-right"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-semibold">
                        {docHeaderSeason}
                      </span>
                    )}
                  </div>

                  {isEditMode ? (
                    <input 
                      type="text"
                      value={docHeaderTitle}
                      onChange={(e) => setDocHeaderTitle(e.target.value)}
                      className="w-full text-2xl sm:text-3xl font-black text-slate-950 tracking-tight bg-transparent hover:bg-slate-50 focus:bg-white border-b-2 border-transparent hover:border-slate-300 focus:border-zinc-900 outline-none px-1 rounded-sm transition-all"
                    />
                  ) : (
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                      {docHeaderTitle}
                    </h1>
                  )}

                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    {currentRider.title} — Documento de cumplimiento obligatorio para promotores y venues.
                  </p>
                </div>

                {/* ========================================= */}
                {/* RENDER CONDICIONAL DE SECCIONES (TÉCNICO) */}
                {/* ========================================= */}
                {riderType === 'tecnico' && (
                  <div className="space-y-8">
                    {currentRider.sections.map((sec) => {
                      // 01: Contactos
                      if (sec.id === 'tech-contactos') {
                        return (
                          <div key={sec.id} id="tech-contactos" className="space-y-3 pt-2 group relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                  <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                                </h4>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{sec.tag}</span>
                              </div>

                              <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingSection(sec)}
                                  className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                                  title="Editar en formulario enfocado"
                                >
                                  <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSectionCompletion(sec.id)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                >
                                  {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase block">FOH Sound Engineer</span>
                                <span className="text-xs font-bold text-slate-800 block">Mateo Rincón</span>
                                <span className="text-[11px] text-slate-400 font-medium">+57 300 123 4567 • foh@soundwave.com</span>
                              </div>
                              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                                <span className="text-[10px] font-bold text-zinc-500 uppercase block">Stage Manager & Backline</span>
                                <span className="text-xs font-bold text-slate-800 block">Carla Mendoza</span>
                                <span className="text-[11px] text-slate-400 font-medium">+57 310 987 6543 • stage@soundwave.com</span>
                              </div>
                            </div>

                            {isEditMode && (
                              <div className="pt-1">
                                <textarea
                                  rows={2}
                                  value={sec.content || ''}
                                  onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                                  placeholder="Notas técnicas o requerimientos adicionales de contacto..."
                                  className="w-full text-xs text-slate-600 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-dashed border-slate-200 focus:border-zinc-800 rounded-xl p-2.5 outline-none transition-all resize-none leading-relaxed"
                                />
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 02: PA & FOH
                      if (sec.id === 'tech-pa') {
                        return (
                          <div key={sec.id} id="tech-pa" className="space-y-3 pt-2 group relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                  <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                                </h4>
                                <span className="text-[10px] bg-violet-100 text-zinc-800 px-2 py-0.5 rounded-full font-bold">{sec.tag}</span>
                              </div>
                              <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingSection(sec)}
                                  className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                                  title="Editar en formulario enfocado"
                                >
                                  <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSectionCompletion(sec.id)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                >
                                  {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                                </button>
                              </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-700">
                              {isEditMode ? (
                                <textarea
                                  rows={3}
                                  value={sec.content || ''}
                                  onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                                  className="w-full text-xs text-slate-800 bg-white border border-slate-200 focus:border-zinc-800 rounded-xl p-3 outline-none transition-all resize-none leading-relaxed font-medium"
                                />
                              ) : (
                                <p className="whitespace-pre-line leading-relaxed">
                                  {sec.content}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // 03: Monitores
                      if (sec.id === 'tech-monitores') {
                        return (
                          <div key={sec.id} id="tech-monitores" className="space-y-3 pt-2 group relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                  <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                                </h4>
                                <span className="text-[10px] bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded-full font-bold">{sec.tag}</span>
                              </div>
                              <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingSection(sec)}
                                  className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                                  title="Editar en formulario enfocado"
                                >
                                  <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSectionCompletion(sec.id)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                >
                                  {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                              <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-100">
                                <span className="text-[10px] font-bold text-sky-700 block">Mix 1-2 (Lead Vocal)</span>
                                <span className="font-bold text-slate-800">Shure PSM 1000</span>
                              </div>
                              <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-100">
                                <span className="text-[10px] font-bold text-sky-700 block">Mix 3-4 (Guitarra/Coros)</span>
                                <span className="font-bold text-slate-800">Shure PSM 1000</span>
                              </div>
                              <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-100">
                                <span className="text-[10px] font-bold text-sky-700 block">Mix 5-6 (Batería)</span>
                                <span className="font-bold text-slate-800">Cableado + ButtKicker</span>
                              </div>
                            </div>

                            {isEditMode && (
                              <div className="pt-1">
                                <textarea
                                  rows={2}
                                  value={sec.content || ''}
                                  onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                                  placeholder="Especificaciones adicionales de frecuencias RF y mezclas..."
                                  className="w-full text-xs text-slate-600 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-dashed border-slate-200 focus:border-zinc-800 rounded-xl p-2.5 outline-none transition-all resize-none leading-relaxed"
                                />
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 04: Backline
                      if (sec.id === 'tech-backline') {
                        return (
                          <div key={sec.id} id="tech-backline" className="space-y-3 pt-2 group relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                  <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                                </h4>
                                <span className="text-[10px] bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded-full font-bold">{sec.tag}</span>
                              </div>
                              <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingSection(sec)}
                                  className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                                  title="Editar en formulario enfocado"
                                >
                                  <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSectionCompletion(sec.id)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                >
                                  {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                                </button>
                              </div>
                            </div>

                            {isEditMode ? (
                              <textarea
                                rows={4}
                                value={sec.content || ''}
                                onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-200 focus:border-zinc-800 rounded-xl p-3 outline-none transition-all resize-none leading-relaxed font-medium"
                              />
                            ) : (
                              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                {sec.content}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // 05: Input List
                      if (sec.id === 'tech-inputlist') {
                        return (
                          <div key={sec.id} id="tech-inputlist" className="space-y-3 pt-2 group relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                  <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                                </h4>
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                  {inputListChannels.length} Canales
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isEditMode && (
                                  <button
                                    type="button"
                                    onClick={handleAddChannel}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-2xs transition-all flex items-center gap-1 active:scale-95"
                                    title="Agregar fila a la Input List"
                                  >
                                    <Icon name="plus" className="w-3 h-3 text-emerald-600" />
                                    <span>+ Agregar Canal</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => toggleSectionCompletion(sec.id)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                >
                                  {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                                </button>
                              </div>
                            </div>

                            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-2xs bg-white">
                              <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold">
                                  <tr>
                                    <th className="p-2.5 w-12 text-center">CH</th>
                                    <th className="p-2.5">Instrumento</th>
                                    <th className="p-2.5">Mic / DI</th>
                                    <th className="p-2.5">Atril / Stand</th>
                                    {isEditMode && <th className="p-2.5 w-10 text-center">Acción</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {inputListChannels.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                      <td className="p-2 text-center font-bold text-zinc-800">{item.ch}</td>
                                      <td className="p-2">
                                        {isEditMode ? (
                                          <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleUpdateChannel(item.id, 'name', e.target.value)}
                                            className="w-full bg-transparent hover:bg-white focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-zinc-800 px-1 py-0.5 rounded outline-none font-bold text-slate-800"
                                          />
                                        ) : (
                                          <span>{item.name}</span>
                                        )}
                                      </td>
                                      <td className="p-2">
                                        {isEditMode ? (
                                          <input
                                            type="text"
                                            value={item.mic}
                                            onChange={(e) => handleUpdateChannel(item.id, 'mic', e.target.value)}
                                            className="w-full bg-transparent hover:bg-white focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-zinc-800 px-1 py-0.5 rounded outline-none text-slate-700"
                                          />
                                        ) : (
                                          <span>{item.mic}</span>
                                        )}
                                      </td>
                                      <td className="p-2">
                                        {isEditMode ? (
                                          <input
                                            type="text"
                                            value={item.stand}
                                            onChange={(e) => handleUpdateChannel(item.id, 'stand', e.target.value)}
                                            className="w-full bg-transparent hover:bg-white focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-zinc-800 px-1 py-0.5 rounded outline-none text-slate-500"
                                          />
                                        ) : (
                                          <span>{item.stand}</span>
                                        )}
                                      </td>
                                      {isEditMode && (
                                        <td className="p-2 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteChannel(item.id)}
                                            className="w-6 h-6 rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-600 inline-flex items-center justify-center transition-colors"
                                            title="Eliminar este canal"
                                          >
                                            <Icon name="trash" className="w-3 h-3" />
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      }

                      // 06: Stage Plot
                      if (sec.id === 'tech-stageplot') {
                        return (
                          <div key={sec.id} id="tech-stageplot" className="space-y-3 pt-2 group relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                  <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                                </h4>
                                <span className="text-[10px] bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded-full font-bold">{sec.tag}</span>
                              </div>
                              <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingSection(sec)}
                                  className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                                  title="Editar en formulario enfocado"
                                >
                                  <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSectionCompletion(sec.id)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                >
                                  {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                                </button>
                              </div>
                            </div>

                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-3">
                              <div className="flex justify-around items-center text-xs font-bold text-slate-600">
                                <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">BATERÍA (Riser 2x2m)</div>
                                <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">BAJO + AMPLI</div>
                              </div>
                              <div className="flex justify-around items-center text-xs font-bold text-slate-600 pt-4">
                                <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">GUITARRA + PEDALERA</div>
                                <div className="bg-zinc-900 text-white p-3.5 rounded-xl shadow-xs">VOZ PRINCIPAL (Front)</div>
                                <div className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">TECLADOS / SINTES</div>
                              </div>
                              <span className="text-[11px] text-slate-400 block pt-2">
                                * Cada estación requiere 4 tomas 110V/220V aterrizadas y reguladas.
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // 07: Iluminación
                      if (sec.id === 'tech-iluminacion') {
                        return (
                          <div key={sec.id} id="tech-iluminacion" className="space-y-3 pt-2 group relative">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                  <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                                </h4>
                                <span className="text-[10px] bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded-full font-bold">{sec.tag}</span>
                              </div>
                              <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setEditingSection(sec)}
                                  className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                                >
                                  <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleSectionCompletion(sec.id)}
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                                >
                                  {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                                </button>
                              </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-700">
                              {isEditMode ? (
                                <textarea
                                  rows={3}
                                  value={sec.content || ''}
                                  onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                                  className="w-full text-xs text-slate-800 bg-white border border-slate-200 focus:border-zinc-800 rounded-xl p-3 outline-none transition-all resize-none leading-relaxed font-medium"
                                />
                              ) : (
                                <p className="whitespace-pre-line leading-relaxed">
                                  {sec.content}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Secciones dinámicas agregadas por el usuario o personalizadas
                      return (
                        <div key={sec.id} id={sec.id} className="space-y-3 pt-2 group relative">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                                <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                              </h4>
                              <span className={`text-[10px] ${sec.tagColor || "bg-violet-100 text-zinc-800"} px-2 py-0.5 rounded-full font-bold`}>
                                {sec.tag}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingSection(sec)}
                                className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                              >
                                <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSectionCompletion(sec.id)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${currentCompletedList.includes(sec.id) ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                              >
                                {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-700">
                            <p className="font-extrabold text-slate-900">{sec.subtitle}</p>
                            {isEditMode ? (
                              <textarea
                                rows={3}
                                value={sec.content || ''}
                                onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                                className="w-full text-xs text-slate-800 bg-white border border-slate-200 focus:border-zinc-800 rounded-xl p-3 outline-none transition-all resize-none leading-relaxed font-medium"
                              />
                            ) : (
                              <p className="whitespace-pre-line leading-relaxed text-slate-700">
                                {sec.content}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ============================================== */}
                {/* RENDER CONDICIONAL DE SECCIONES (HOSPITALITY) */}
                {/* ============================================== */}
                {riderType === 'hospitality' && (
                  <div className="space-y-8">
                    {currentRider.sections.map((sec) => (
                      <div key={sec.id} id={sec.id} className="space-y-3 pt-2 group relative">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                              <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                            </h4>
                            <span className={`text-[10px] ${sec.tagColor || 'bg-zinc-100 text-zinc-900'} px-2 py-0.5 rounded-full font-bold`}>
                              {sec.tag}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingSection(sec)}
                              className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                            >
                              <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSectionCompletion(sec.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                currentCompletedList.includes(sec.id)
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                            >
                              {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-700">
                          <p className="font-extrabold text-slate-900">{sec.subtitle}</p>
                          {isEditMode ? (
                            <textarea
                              rows={3}
                              value={sec.content || ''}
                              onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                              className="w-full text-xs text-slate-800 bg-white border border-slate-200 focus:border-zinc-800 rounded-xl p-3 outline-none transition-all resize-none leading-relaxed font-medium"
                            />
                          ) : (
                            <p className="whitespace-pre-line leading-relaxed text-slate-700">
                              {sec.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ============================================= */}
                {/* RENDER CONDICIONAL DE SECCIONES (SEGURIDAD)   */}
                {/* ============================================= */}
                {riderType === 'seguridad' && (
                  <div className="space-y-8">
                    {currentRider.sections.map((sec) => (
                      <div key={sec.id} id={sec.id} className="space-y-3 pt-2 group relative">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                              <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                            </h4>
                            <span className={`text-[10px] ${sec.tagColor || 'bg-zinc-100 text-zinc-900'} px-2 py-0.5 rounded-full font-bold`}>
                              {sec.tag}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => setEditingSection(sec)}
                              className="bg-white hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs flex items-center gap-1 transition-all"
                            >
                              <Icon name="edit" className="w-3 h-3 text-zinc-900" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSectionCompletion(sec.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                                currentCompletedList.includes(sec.id)
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                            >
                              {currentCompletedList.includes(sec.id) ? '✓ Listo' : '○ Pendiente'}
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-700">
                          <p className="font-extrabold text-slate-900">{sec.subtitle}</p>
                          {isEditMode ? (
                            <textarea
                              rows={3}
                              value={sec.content || ''}
                              onChange={(e) => handleUpdateSectionInline(sec.id, { content: e.target.value })}
                              className="w-full text-xs text-slate-800 bg-white border border-slate-200 focus:border-zinc-800 rounded-xl p-3 outline-none transition-all resize-none leading-relaxed font-medium"
                            />
                          ) : (
                            <p className="whitespace-pre-line leading-relaxed text-slate-700">
                              {sec.content}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Secciones Personalizadas Añadidas Dinámicamente */}
                {currentRider.sections.filter(sec => sec.id.startsWith('custom-')).length > 0 && (
                  <div className="space-y-8 pt-6 border-t-2 border-dashed border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black tracking-widest text-zinc-800 uppercase bg-violet-50 border border-zinc-200 px-3 py-1 rounded-full shadow-2xs">
                        Secciones Personalizadas Adicionales ({currentRider.sections.filter(sec => sec.id.startsWith('custom-')).length})
                      </span>
                    </div>

                    {currentRider.sections
                      .filter(sec => sec.id.startsWith('custom-'))
                      .map((sec) => (
                        <div key={sec.id} id={sec.id} className="space-y-3 pt-2 animate-fade-in scroll-mt-6">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                              <span className="text-zinc-900 font-black">{sec.num}.</span> {sec.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleSectionCompletion(sec.id)}
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 active:scale-95 ${
                                  currentCompletedList.includes(sec.id)
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {currentCompletedList.includes(sec.id) ? '✓ Revisado' : '○ Pendiente'}
                              </button>
                              <span className={`text-[10px] ${sec.tagColor || 'bg-violet-100 text-zinc-800'} px-2.5 py-0.5 rounded-full font-bold`}>
                                {sec.tag}
                              </span>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-700">
                            <p className="font-extrabold text-slate-900">{sec.subtitle}</p>
                            <p className="whitespace-pre-line text-slate-600 leading-relaxed font-medium">
                              {sec.content}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                </motion.div>
              </AnimatePresence>
            </section>

            {/* ---------------------------------------------------- */}
            {/* PANEL DERECHO (25%): Chat de Inteligencia Artificial (Opcional / Colapsable) */}
            {/* ---------------------------------------------------- */}
            {!isChatCollapsed && (
              <section className="col-span-3 h-full min-h-0 flex flex-col gap-2.5 sm:gap-3 overflow-hidden animate-slide-in-right">
                
                {/* Tarjeta del Chat Copilot */}
                <div className="flex-1 min-h-0 bg-white/95 backdrop-blur-xl rounded-[26px] p-4 shadow-xs border border-white flex flex-col overflow-hidden">
                  
                  {/* Header del Chat */}
                  <div className="shrink-0 flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        {activeAgent === 'audio_foh' ? '🎛️' : activeAgent === 'hospitality' ? '☕' : activeAgent === 'security' ? '🛡️' : '🧠'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-xs text-slate-900 leading-tight">
                          {AGENT_PROFILES[activeAgent]?.name || 'Agente Producción'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">
                          {AGENT_PROFILES[activeAgent]?.title || 'Copilot de Gira'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsChatCollapsed(true);
                          showToast('Chat ocultado. Documento expandido a vista completa.');
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-full font-bold transition-all flex items-center"
                        title="Ocultar chat y expandir documento"
                      >
                        <Icon name="panelRightClose" className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigateTo('chat_prompt', 'forward')}
                        className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/25 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                        title="Expandir a la pantalla del asistente"
                      >
                        <Icon name="sparkles" className="w-3.5 h-3.5 text-white" />
                        <span>Expandir ↗</span>
                      </button>
                    </div>
                  </div>

                  {/* Selector de Agentes de IA Especializados */}
                  <div className="shrink-0 py-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto">
                    {(['master', 'audio_foh', 'hospitality', 'security'] as AgentRole[]).map((role) => {
                      const isActive = activeAgent === role;
                      const icons = { master: '🧠', audio_foh: '🎛️', hospitality: '☕', security: '🛡️' };
                      const labels = { master: 'Master', audio_foh: 'Audio', hospitality: 'Hospitality', security: 'Seguridad' };
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setActiveAgent(role);
                            showToast(`Agente activo: ${AGENT_PROFILES[role].name}`);
                          }}
                          className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                            isActive
                              ? 'bg-zinc-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{icons[role]}</span>
                          <span>{labels[role]}</span>
                        </button>
                      );
                    })}
                  </div>

                {/* Historial de Mensajes */}
                <div className="flex-1 min-h-0 overflow-y-auto py-2.5 space-y-2.5 pr-1 text-xs">
                  {messages.map((m, idx) => (
                    <div 
                      key={idx}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {m.sender === 'ai' && (
                        <div className="flex items-center gap-1 mb-0.5 px-1">
                          <span className="text-[10px]">{m.roleAvatar || '🧠'}</span>
                          <span className="text-[10px] font-bold text-slate-600">{m.roleName || 'Agente'}</span>
                        </div>
                      )}
                      <div className={`p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-zinc-900 text-white rounded-tr-xs shadow-xs'
                          : 'bg-slate-100/80 text-slate-800 rounded-tl-xs'
                      }`}>
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 font-semibold px-1">
                        {m.time}
                      </span>
                    </div>
                  ))}

                  {/* Indicador de pensamiento */}
                  {isAgentThinking && (
                    <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-violet-50/80 border border-violet-100 text-violet-700 text-[11px] font-semibold animate-pulse w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-ping" />
                      <span>{AGENT_PROFILES[activeAgent]?.name || 'Agente'} escribiendo...</span>
                    </div>
                  )}
                </div>

                {/* Chips de Preguntas Sugeridas */}
                <div className="shrink-0 pt-2 pb-1 flex flex-wrap gap-1.5">
                  <button 
                    onClick={() => handleSendPromptDirectly('Agrega 2 micrófonos inalámbricos adicionales a la Input List')}
                    className="text-[10px] bg-slate-50 hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200/60 px-2.5 py-1 rounded-full transition-all text-left truncate max-w-full cursor-pointer active:scale-95"
                  >
                    + Agregar micrófono inalámbrico
                  </button>
                  <button 
                    onClick={() => handleSendPromptDirectly('Cambia el hotel a categoría Boutique y confirma late check-out')}
                    className="text-[10px] bg-slate-50 hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200/60 px-2.5 py-1 rounded-full transition-all text-left truncate max-w-full cursor-pointer active:scale-95"
                  >
                    + Ajustar hotelería
                  </button>
                </div>

                {/* Input de Chat con Botón Enviar */}
                <form onSubmit={handleSendMessage} className="shrink-0 mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Pídele un cambio al agente..."
                    className="flex-1 bg-slate-50 border border-slate-200/80 rounded-full px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-all shrink-0 shadow-xs shadow-violet-600/20"
                  >
                    <Icon name="send" className="w-3.5 h-3.5" />
                  </button>
                </form>

              </div>

            </section>
            )}

          </div>

          {/* Botón flotante para mostrar el Chat cuando está oculto */}
          <AnimatePresence>
            {isChatCollapsed && (
              <motion.button
                type="button"
                onClick={() => {
                  setIsChatCollapsed(false);
                  showToast('Chat del asistente desplegado.');
                }}
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 15 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="fixed bottom-6 right-6 z-40 bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-full shadow-lg shadow-violet-600/30 border border-violet-500/40 flex items-center gap-2.5 font-bold text-xs backdrop-blur-md group hover:shadow-[0_12px_30px_-4px_rgba(124,58,237,0.65)] transition-all"
                title="Mostrar el chat del asistente"
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <Icon name="messageSquare" className="w-3.5 h-3.5" />
                </div>
                <span>Mostrar Chat</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
              </motion.button>
            )}
          </AnimatePresence>

        </motion.main>
      )}
      </AnimatePresence>

      {/* Modal: Agregar Nueva Sección al Rider con transición de escala y morfismo */}
      <AnimatePresence>
        {showAddSectionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.form 
              onSubmit={handleAddSection}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-white flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 text-zinc-800 flex items-center justify-center font-bold">
                    <Icon name="plus" className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Nueva Sección para el Rider
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {currentRider.title} (Sección {String(currentRider.sections.length + 1).padStart(2, '0')})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Presets rápidos */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Plantillas Rápidas:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { title: 'Pirotecnia, CO2 & FX', sub: 'Chispa fría, lanzallamas y extintores CO2', tag: 'Efectos', content: 'Uso de 4x máquinas de chispa fría Sparkular y 2x cañones de CO2. Se requiere técnico certificado con extintores de CO2 dedicados en cada extremo del escenario.' },
                    { title: 'Transmisión & Broadcast', sub: 'Splitter de audio aislado & cámaras', tag: 'Streaming', content: 'Salida de audio estéreo o multitrack de 32 canales mediante split pasivo transformer-isolated dedicado para la unidad móvil de televisión/streaming.' },
                    { title: 'Personal Local (Crew)', sub: '6 Stagehands sobrios + 1 Runner 24h', tag: 'Personal', content: 'Se requieren 6 cargadores (stagehands) con botas de seguridad para carga y descarga, más 1 runner local bilingüe con camioneta espaciosa disponible.' },
                    { title: 'Protocolo Médico', sub: 'Ambulancia soporte vital y pruebas', tag: 'Salud', content: 'Ambulancia de soporte vital con paramédico en punto de acceso rápido detrás del escenario durante todo el show y prueba de sonido.' }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewSecTitle(preset.title);
                        setNewSecSubtitle(preset.sub);
                        setNewSecTag(preset.tag);
                        setNewSecContent(preset.content);
                      }}
                      className="text-[11px] bg-slate-50 hover:bg-zinc-100 text-slate-600 hover:text-zinc-800 border border-slate-200/70 hover:border-zinc-400 px-2.5 py-1 rounded-full transition-all"
                    >
                      + {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos del Formulario */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Título de la Sección *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSecTitle}
                    onChange={(e) => setNewSecTitle(e.target.value)}
                    placeholder="ej. Requisitos de Pirotecnia & Efectos"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Subtítulo / Breve resumen
                    </label>
                    <input
                      type="text"
                      value={newSecSubtitle}
                      onChange={(e) => setNewSecSubtitle(e.target.value)}
                      placeholder="ej. Permisos de seguridad y CO2"
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Etiqueta / Tag
                    </label>
                    <input
                      type="text"
                      value={newSecTag}
                      onChange={(e) => setNewSecTag(e.target.value)}
                      placeholder="ej. Efectos, Seguridad, Audio..."
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Especificaciones Técnicas / Contenido del Documento
                  </label>
                  <textarea
                    rows={3}
                    value={newSecContent}
                    onChange={(e) => setNewSecContent(e.target.value)}
                    placeholder="Describe detalladamente los requisitos que el promotor o venue debe cumplir para esta sección..."
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSectionModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-full text-xs font-bold shadow-xs shadow-violet-600/25 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Icon name="check" className="w-3.5 h-3.5" />
                  <span>Agregar al Rider</span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Sección Existente con Formulario Completo */}
      <AnimatePresence>
        {editingSection && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.form 
              onSubmit={handleSaveEditedSection}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="bg-white rounded-[28px] max-w-lg w-full p-6 shadow-2xl border border-white flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 text-zinc-800 flex items-center justify-center font-bold">
                    <Icon name="edit" className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Editar Sección {editingSection.num}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Modifica título, subtítulo, etiqueta y contenido técnico
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Campos del Formulario de Edición */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Título de la Sección *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingSection.title}
                    onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Subtítulo / Resumen
                    </label>
                    <input
                      type="text"
                      value={editingSection.subtitle}
                      onChange={(e) => setEditingSection({ ...editingSection, subtitle: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">
                      Etiqueta / Tag
                    </label>
                    <input
                      type="text"
                      value={editingSection.tag}
                      onChange={(e) => setEditingSection({ ...editingSection, tag: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">
                    Especificaciones Técnicas / Contenido del Rider
                  </label>
                  <textarea
                    rows={4}
                    value={editingSection.content || ''}
                    onChange={(e) => setEditingSection({ ...editingSection, content: e.target.value })}
                    placeholder="Escribe las especificaciones técnicas obligatorias..."
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-slate-800 placeholder-slate-400 outline-none focus:border-zinc-800 focus:bg-white transition-all font-medium resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteSection(editingSection.id, editingSection.title);
                    setEditingSection(null);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-all flex items-center gap-1"
                >
                  <Icon name="trash" className="w-3.5 h-3.5" />
                  <span>Eliminar Sección</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSection(null)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-full text-xs font-bold shadow-xs shadow-violet-600/25 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Icon name="check" className="w-3.5 h-3.5" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

