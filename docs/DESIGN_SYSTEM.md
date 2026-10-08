# Rider Studio — Design System & Component Specification
**Versión:** 1.0.0  
**Ámbito:** Arquitectura Frontend, UI/UX, Componentes Reutilizables y Estandarización Visual.

---

## 1. Filosofía de Diseño

El sistema visual de **Rider Studio** está concebido bajo el concepto **"Production-Grade Swiss Glassmorphism"**:
* **Claridad Técnica:** Diseñado para la lectura rápida de ingenieros de audio, coordinadores de gira y jefes de seguridad en recintos con alta presión operativa.
* **Superficies Suaves y Translúcidas:** Uso de capas de cristal esmerilado (`bg-white/70 backdrop-blur-md`) sobre fondos neutros fríos (`#f8f9fa`) para separar jerarquías sin generar ruido visual.
* **Microinteracciones Precisas:** Respuesta táctil inmediata con muelles elásticos de alta fidelidad (`stiffness: 450, damping: 30-35`), escalas activas (`active:scale-95`) y transiciones de 150-200ms.
* **Jerarquía Tipográfica Fuerte:** Contrastes intencionales entre titulares hiper-negritas (`font-black 900` / `font-extrabold 800`) y metadatos técnicos compactos (`text-[10px] uppercase tracking-wider`).

---

## 2. Tokens de Diseño (Design Tokens)

### 2.1. Paleta de Colores

```
┌────────────────────────────────────────────────────────────────────────┐
│ PRIMARY BRAND ACCENT                                                  │
│ • Violet 600: #7c3aed (Acción primaria, logo, estado activo)           │
│ • Indigo 600: #4f46e5 (Degradado principal junto a Violet 600)         │
│ • Violet 50:  #f5f3ff (Fondos sutiles de selección y píldoras)         │
├────────────────────────────────────────────────────────────────────────┤
│ NEUTRAL SCALE (SLATE / ZINC)                                           │
│ • Canvas Background: #f8f9fa (Lienzo global de la aplicación)          │
│ • Card Background:   #ffffff con bordes #e2e8f0 (Slate 200)            │
│ • Text Primary:      #0f172a (Slate 900) - Títulos y datos críticos    │
│ • Text Secondary:    #475569 (Slate 600) - Cuerpo y descripciones      │
│ • Text Muted:        #94a3b8 (Slate 400) - Metadatos, etiquetas, tips │
├────────────────────────────────────────────────────────────────────────┤
│ DOMAIN ACCENTS (SUB-MARCAS POR RIDER Y AGENTE)                         │
│ • Técnico / Audio FOH:   Sky 600 (#0284c7) / Violet 600 (#7c3aed)      │
│ • Hospitality / Care:    Amber 600 (#d97706) / Sky 600 (#0284c7)       │
│ • Seguridad / Protocolo: Emerald 600 (#059669) / Amber 600 (#d97706)   │
├────────────────────────────────────────────────────────────────────────┤
│ SEMANTIC FEEDBACK                                                      │
│ • Success / Complete: Emerald 500 (#10b981) + Emerald 50 (#ecfdf5)     │
│ • Warning / In Progress: Amber 500 (#f59e0b) + Amber 50 (#fffbeb)      │
│ • Danger / Delete:    Rose 600 (#e11d48) + Rose 50 (#fff1f2)           │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2. Tipografía y Escala
* **Fuente Principal:** `Geist Sans` (`var(--font-geist-sans)`)
* **Fuente Monoespaciada (Códigos y Canales):** `Geist Mono` (`var(--font-geist-mono)`)

| Nivel | Clase Tailwind | Peso | Uso Habitual |
| :--- | :--- | :--- | :--- |
| **Hero Title** | `text-3xl sm:text-5xl tracking-tight` | `font-black` (900) | Landing hero |
| **Doc Title** | `text-2xl sm:text-3xl tracking-tight` | `font-black` (900) | Encabezado oficial del rider |
| **Section Title** | `text-base font-extrabold leading-snug` | `font-extrabold` (800) | Tarjetas de sección |
| **Subtitle / Meta** | `text-xs font-semibold` | `font-semibold` (600) | Resumen técnico |
| **Body Content** | `text-xs leading-relaxed` | `font-normal` (400) | Bullets de requerimientos |
| **Micro Labels** | `text-[10px] sm:text-[11px] uppercase tracking-wider` | `font-black` (900) | Píldoras, badges, canales |

### 2.3. Radios de Borde (Border Radius)
* `rounded-full`: Botones de acción, píldoras de navegación, badges de estado, chips.
* `rounded-3xl` (`24px`): Contenedores principales, tarjetas de riders en landing, hero boxes.
* `rounded-[28px]` / `rounded-[32px]`: Tarjetas de sección del workspace y ventanas modales de edición.
* `rounded-2xl` (`16px`): Elementos de lista interactivos, inputs de formulario, paneles compactos.
* `rounded-xl` (`12px`): Sub-botones, iconos de cabecera, filas de tabla.

### 2.4. Sombras y Elevación
* **Canvas Flat:** `border border-slate-200/80`
* **Card Soft:** `shadow-[0_8px_30px_-6px_rgba(100,116,139,0.06)]`
* **Doc Hero Deep:** `shadow-[0_12px_36px_-10px_rgba(100,116,139,0.06)]`
* **Primary Button Glow:** `shadow-md shadow-violet-500/25`
* **Overlay Backdrop:** `bg-slate-900/50 backdrop-blur-xs`

---

## 3. Catálogo de Componentes Reutilizables

```mermaid
graph TD
    App[Aplicación / Router] --> Header[Header.tsx]
    App --> Toast[Toast.tsx]
    
    subgraph Landing[/Landing Page - /]
        Hero[HeroSection.tsx]
        Pills[TemplatePills.tsx]
        Chats[RecentChatsCard.tsx]
        Grid[SavedRidersGrid.tsx]
    end
    
    subgraph Workspace[/Workspace 3 Paneles - /workspace]
        Nav[SectionsNavPanel.tsx]
        Doc[DocumentEditorPanel.tsx]
        ChatPanel[AssistantChatPanel.tsx]
        Doc --> Table[InputListTable.tsx]
        WorkspaceModals[AddSectionModal.tsx / EditSectionModal.tsx]
    end

    subgraph Chat[/Chat Dedicado - /chat]
        ChatView[ChatView.tsx]
    end
```

### 3.1. Componentes Globales (`src/components/common/`)

#### `<Header />`
Barra de navegación fija superior (`h-16 sticky top-0 z-40 bg-white/70 backdrop-blur-md`).
* **Props:**
  * `pageType: 'landing' | 'workspace' | 'chat'`
  * `riderType?: RiderType`
  * `onSelectRiderType?: (type: RiderType) => void`
  * `completedCount?: number`
  * `totalCount?: number`
  * `progressPercent?: number`
  * `onSaveRider?: () => void`
  * `isSaving?: boolean`
  * `dbSyncStatus?: 'idle' | 'saving' | 'saved' | 'error'`
  * `onExport?: () => void`
  * `onOpenStagePlot?: () => void`
* **Reglas:**
  * En `landing`: Muestra el branding y avatar de usuario.
  * En `workspace`: Activa el selector de píldoras por tipo, el progress bar general y el botón de guardado en base de datos.
  * En `chat`: Muestra breadcrumb de retorno rápido al inicio.

#### `<Icon />`
Biblioteca centralizada de iconos vectoriales SVG limpios.
* **Props:** `name: string; className?: string` (por defecto `w-4 h-4`).
* **Iconos Disponibles:** `sparkles`, `database`, `map`, `list`, `speaker`, `headphones`, `guitar`, `users`, `coffee`, `wine`, `hotel`, `door`, `truck`, `shield`, `barrier`, `userCheck`, `heartPulse`, `flame`, `send`, `check`, `clock`, `arrowLeft`, `fileText`, `messageSquare`, `edit`, `trash`, `eye`, `grip`, `plus`, `search`, `panelRightClose`, `panelRightOpen`.

#### `<Toast />`
Píldora flotante para feedback no intrusivo (`fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-full animate-bounce`).
* **Props:** `message: string | null`

---

### 3.2. Componentes de Landing (`src/components/landing/`)

#### `<HeroSection />`
Zona de impacto superior con buscador y generación por lenguaje natural.
* **Props:** `onSubmitPrompt: (prompt: string) => void`
* **Estilo:** Input expandido con botón píldora Violet 600 integrado.

#### `<TemplatePills />`
Fila horizontal de accesos directos a las tres plantillas maestras en blanco.
* **Props:** `onSelectType: (type: RiderType) => void`
* **Elementos:**
  1. *Hospitality*: Icono café, acento Sky.
  2. *Técnico*: Icono altavoz, acento Violet/Zinc.
  3. *Seguridad*: Icono escudo, acento Amber.

#### `<RecentChatsCard />`
Módulo de resumen de sesiones de chat previas en la base de datos.
* **Props:** `conversations: ChatSessionSummary[]; onSelectConversation: (id: string) => void; onNewConversation: () => void`

#### `<SavedRidersGrid />`
Rejilla responsive de tarjetas de riders sincronizados en Supabase con filtros por estado (`all`, `in_progress`, `completed`).
* **Props:** `riders: SavedRiderSummary[]; onOpenRider: (r: SavedRiderSummary) => void; onDeleteRider: (id: string, e?: React.MouseEvent) => void; onNewRider: () => void`
* **Detalle de Tarjeta:** Incluye badge de tipo, título del artista, barra de progreso porcentual y botón directo de borrado con icono de basura.

---

### 3.3. Componentes de Workspace (`src/components/workspace/`)

#### `<SectionsNavPanel />` (Panel 1 - Izquierdo)
Barra lateral (`w-80`) con índice de secciones reordenables por drag-and-drop mediante `motion/react` (`Reorder.Group`).
* **Props:**
  * `docHeaderTitle: string; setDocHeaderTitle: (v: string) => void`
  * `docHeaderSeason: string; setDocHeaderSeason: (v: string) => void`
  * `sections: SectionItem[]; onReorderSections: (s: SectionItem[]) => void`
  * `activeSectionId: string; onSelectSection: (id: string) => void`
  * `completedSectionIds: string[]; onToggleComplete: (id: string, e?: React.MouseEvent) => void`
  * `onOpenAddSection: () => void; onResetBlank: () => void; progressPercent: number`

#### `<DocumentEditorPanel />` (Panel 2 - Central)
Lienzo central de previsualización y edición en vivo del documento final.
* **Props:**
  * `riderTitle: string; artistName: string; season: string; riderType: RiderType`
  * `sections: SectionItem[]; channels: ChannelInput[]`
  * `completedSectionIds: string[]; onToggleComplete: (id: string, e?: React.MouseEvent) => void`
  * `onEditSection: (s: SectionItem) => void`
  * `onUpdateChannel: (chId: string, field: 'name'|'mic'|'stand', val: string) => void`
  * `onAddChannel: () => void; onDeleteChannel: (chId: string) => void`
  * `onExport: () => void; onOpenStagePlot: () => void`
* **Comportamiento:** Si la sección es `tech-inputlist` y el rider es `tecnico`, incrusta automáticamente `<InputListTable />`.

#### `<InputListTable />` (Sub-componente Especializado)
Tabla interactiva para la configuración de canales de escenario de la sección 05.
* **Props:** `channels: ChannelInput[]; onUpdateChannel: (...); onAddChannel: (); onDeleteChannel: (chId: string)`
* **Columnas:** `CH` (número secuencial de dos dígitos), `Canal / Fuente`, `Micrófono / DI`, `Atril / Stand`, `Acción Borrar`.

#### `<AssistantChatPanel />` (Panel 3 - Derecho)
Copilot conversacional colaborativo con pestañas especializadas de agente (`master`, `audio_foh`, `hospitality`, `security`).
* **Props:**
  * `activeAgent: AgentRole; onSelectAgent: (role: AgentRole) => void`
  * `messages: ChatMessageItem[]; isThinking: boolean; onSendMessage: (text: string) => void`
  * `isCollapsed: boolean; onToggleCollapse: () => void`
* **Modo Colapsado:** Se reduce a una columna delgada (`w-14`) con texto vertical e indicador de actividad para maximizar el área de trabajo.

---

### 3.4. Modales y Overlays (`src/components/modals/`)

#### `<AddSectionModal />` & `<EditSectionModal />`
Diálogos flotantes centrados con animación de apertura elástica (`initial: scale 0.92, animate: scale 1, spring stiffness: 450, damping: 30`).
* **Estructura Estándar:**
  * Cabecera con icono temático y botón cerrar circular `✕`.
  * Presets rápidos (en el caso de añadir sección).
  * Campos de formulario con etiqueta en mayúsculas `text-[11px] font-bold text-slate-400 uppercase` e inputs con `focus:border-zinc-800`.
  * Pie con acción secundaria ("Cancelar") y primaria en píldora Violet 600.

---

## 4. Guía para Nuevas Implementaciones (Guía de Extensión)

Al crear nuevas vistas o componentes para **Rider Studio**, sigue estrictamente estas directrices:

### 4.1. Reglas de Estilo Obligatorias
1. **Nunca usar bordes negros duros:** Emplear siempre `border-slate-200/80` o `border-slate-200/60`.
2. **Botones de acción:** Siempre usar la forma de píldora completa (`rounded-full`) o súper elipse (`rounded-2xl`).
3. **Inputs de texto:** Utilizar fondo sutil `bg-slate-50 border border-slate-200/80` que transmute a `focus:bg-white focus:border-violet-500` con `transition-all`.
4. **Textos secundarios y metadatos:** Emplear pesos pesados en tamaños pequeños (`text-[10px] font-black tracking-wider uppercase text-slate-400`) en lugar de textos largos tenues.
5. **Iconografía:** No importar SVG externos dispersos; agregar el path correspondiente a `<Icon />` en `src/components/common/Icon.tsx`.

### 4.2. Estructura de un Nuevo Componente
```tsx
"use client";

import React from 'react';
import { Icon } from '@/components/common/Icon';

interface NewComponentProps {
  title: string;
  onAction: () => void;
}

export function NewComponent({ title, onAction }: NewComponentProps) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:border-violet-300 transition-all">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        <button
          onClick={onAction}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
        >
          <Icon name="check" className="w-3.5 h-3.5" />
          <span>Acción</span>
        </button>
      </div>
    </div>
  );
}
```

### 4.3. Resumen de Capas Arquitectónicas
* **Dominio (`src/core/models/`):** Si hay lógica de negocio, cálculos o transformaciones de datos, encapsularla en una clase POO (ej. `Rider`, `ChannelInput`).
* **Servicios (`src/core/services/`):** Toda llamada a APIs de Supabase o OpenAI debe residir en su clase de servicio (`IRiderService`, `IChatService`).
* **Componentes (`src/components/`):** Deben ser puramente declarativos, tipados con TypeScript y libres de llamadas HTTP dispersas.
* **Páginas (`src/app/`):** Gestionan el enrutamiento con Next.js App Router y sincronizan el estado en los parámetros de la URL para garantizar persistencia en recarga (F5).
