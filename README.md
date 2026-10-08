# Rider Studio 🎛️
> **Stage & Production Intelligence** — Plataforma inteligente para la creación, previsualización y gestión de Riders para eventos en vivo, giras y festivales.

![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.3-blue?style=flat-square&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)

---

## 🌟 Características Principales

### 1. Flujo de Navegación en 3 Pantallas
- **Landing Page:** 
  - Buscador central con acción rápida para iniciar una conversación con el agente de IA.
  - Píldoras de recomendación directa organizadas en una sola fila (`Rider Hospitality`, `Rider Técnico`, `Rider Seguridad`).
  - Historial dinámico de riders previos (*En Progreso* y *Finalizados*) con barra de avance, artista y detalles de gira.
- **Chat Conversacional con Agente:**
  - Conversación guiada para levantar requerimientos del evento.
  - Chips de sugerencias interactivas y acceso directo al editor.
- **Workspace Inteligente (Editor de 3 Paneles):**
  - **Panel Izquierdo (25%):** Índice jerárquico de secciones numeradas con salto y scroll suave al elemento seleccionado.
  - **Panel Central (50%):** Vista previa oficial del documento en tiempo real (única área con scroll vertical independiente). Incluye tablas técnicas, requerimientos de FOH, mezclas IEM, backline, Input List y distribución de escenario.
  - **Panel Derecho (25%):** Chat Copilot en vivo y acciones de pie de página para **Compartir URL** (copia directa al portapapeles) y **Descargar PDF**.

---

### 2. Secciones Especializadas por Tipo de Rider
Basado en las mejores prácticas de la industria de la música y producción en vivo:
- **Rider Técnico (7 secciones):** Contactos Clave, Sistema PA & FOH, Monitoreo & IEM, Backline Requerido, Input List (Patch 24 canales), Stage Plot & AC, Iluminación & Video.
- **Rider Hospitality (5 secciones):** Camerinos & Producción, Catering & Dietas, Bebidas & Cuidado Vocal, Hospedaje 5★, Logística & Transporte.
- **Rider de Seguridad (4 secciones):** Perímetro & Accesos, Vallas Mojo & Foso, Custodia Artista & Escolta, Plan de Emergencias & Evacuación.

---

### 3. Diseño Visual "Liquid Glass / Soft UI"
- Estética moderna con tarjetas blancas translúcidas (`backdrop-blur-xl`), bordes ultra suaves (`rounded-[26px]`), sombras multicapa tenues y acentos de color ámbar y violeta.
- **Animaciones fluidas:** Transiciones espaciales mediante la **View Transitions API** y animaciones coordinadas de entrada en cascada (*staggered animations*) para paneles, cards y burbujas de chat.
- Soporte para accesibilidad y reducción de movimiento (`prefers-reduced-motion`).

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ (recomendado Node 20+)
- npm, pnpm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone git@github.com:nicolas-suarez-97/rider-studio.git
cd rider-studio

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16 (App Router con Turbopack)
- **Librería UI:** React 19
- **Estilos:** Tailwind CSS v4
- **Lenguaje:** TypeScript 5
- **Iconos:** SVGs vectoriales integrados optimizados

---

## 📄 Licencia

Distribuido bajo la licencia MIT. Consulta `LICENSE` para más detalles.
