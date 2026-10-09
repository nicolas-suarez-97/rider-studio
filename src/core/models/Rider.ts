import { 
  RiderType, 
  SectionItem, 
  ChannelData, 
  SavedRiderSummary, 
  LinkedChatSession,
  StagePlotConfig,
  StageElement,
  RiderModuleData
} from '../types/rider.types';
import { RIDER_DATA } from '../constants/rider-templates';
import { DEFAULT_STAGE_PLOT } from '../constants/stage-plot';
import { ChannelInput } from './ChannelInput';

export class Rider {
  public id: string;
  public title: string;
  public artistName: string;
  public type: RiderType;
  public season: string;
  public venue: string;
  public version: string;
  public status: 'completed' | 'in_progress';
  public sections: SectionItem[];
  public channels: ChannelInput[];
  public completedSectionIds: string[];
  public linkedSessions: LinkedChatSession[];
  public updatedAt: string;
  public modules: Partial<Record<RiderType, RiderModuleData>>;
  public stagePlot: StagePlotConfig;

  constructor(params: {
    id?: string;
    title?: string;
    artistName?: string;
    type?: RiderType;
    season?: string;
    venue?: string;
    version?: string;
    status?: 'completed' | 'in_progress';
    sections?: SectionItem[];
    channels?: (ChannelData | ChannelInput)[];
    completedSectionIds?: string[];
    linkedSessions?: LinkedChatSession[];
    updatedAt?: string;
    modules?: Partial<Record<RiderType, RiderModuleData>>;
    stagePlot?: StagePlotConfig;
  }) {
    this.type = params.type || 'tecnico';
    const template = RIDER_DATA[this.type];
    
    this.id = params.id || '';
    this.title = params.title || template.title;
    this.artistName = params.artistName !== undefined ? params.artistName : '';
    this.season = params.season !== undefined ? params.season : '';
    this.venue = params.venue !== undefined ? params.venue : '';
    this.version = params.version || 'v1.0';
    this.status = params.status || 'in_progress';
    this.sections = params.sections && params.sections.length > 0 
      ? JSON.parse(JSON.stringify(params.sections))
      : (template?.sections || []).map(s => ({ ...s, content: '' }));
    
    this.channels = (params.channels || []).map((c, idx) => 
      c instanceof ChannelInput ? c : ChannelInput.fromData(c, idx)
    );
    this.completedSectionIds = params.completedSectionIds || [];
    this.linkedSessions = params.linkedSessions || [];
    this.updatedAt = params.updatedAt || '';
    this.modules = params.modules || {};

    this.stagePlot = params.stagePlot
      ? JSON.parse(JSON.stringify(params.stagePlot))
      : (this.modules?.tecnico?.stagePlot
        ? JSON.parse(JSON.stringify(this.modules.tecnico.stagePlot))
        : JSON.parse(JSON.stringify(DEFAULT_STAGE_PLOT)));

    this.renumberSections();
    this.renumberChannels();

    if (!this.modules[this.type]) {
      this.modules[this.type] = {
        sections: this.sections,
        channels: this.channels,
        completedSectionIds: this.completedSectionIds,
        stagePlot: this.stagePlot
      };
    }
  }

  /**
   * Crea una instancia en blanco a partir de la plantilla guía por tipo.
   * Sin información pre-llenada: artista, temporada, canales vacíos y
   * secciones base con contenido en blanco listas para redactar.
   */
  public static createBlank(type: RiderType = 'tecnico'): Rider {
    const template = RIDER_DATA[type];
    
    // Mantenemos las secciones base como estructura guía, pero con contenido vacío
    const blankSections: SectionItem[] = (template?.sections || []).map(s => ({
      ...s,
      content: ''
    }));

    return new Rider({
      id: '',
      title: template?.title || 'Rider de Producción',
      artistName: '',
      type,
      season: '',
      venue: '',
      sections: blankSections,
      channels: [],
      completedSectionIds: [],
      stagePlot: {
        stageWidth: 12.0,
        stageDepth: 10.0,
        stageHeight: 1.5,
        elements: []
      }
    });
  }

  /**
   * Crea una instancia de dominio desde un registro de base de datos
   */
  public static fromDatabase(row: {
    id?: string;
    title?: string;
    artist_name?: string;
    rider_type?: string;
    venue_name?: string | null;
    version?: string;
    status?: string;
    channels?: unknown;
    sections?: unknown;
    metadata?: unknown;
    chat_sessions?: Array<{
      id: string;
      title: string;
      updated_at?: string;
      active_agent?: string;
    }>;
    created_at?: string;
    updated_at?: string;
  }): Rider {
    const rType: RiderType = (row.rider_type as RiderType) || 'tecnico';
    const channels = Array.isArray(row.channels) ? (row.channels as ChannelData[]) : [];
    const sections = Array.isArray(row.sections) && row.sections.length > 0
      ? (row.sections as SectionItem[])
      : (RIDER_DATA[rType]?.sections || []).map(s => ({ ...s, content: '' }));

    const linkedSessions: LinkedChatSession[] = Array.isArray(row.chat_sessions)
      ? row.chat_sessions.map((cs) => ({
          id: cs.id,
          title: cs.title,
          updatedAt: cs.updated_at
        }))
      : [];

    const meta = row.metadata as {
      season?: string;
      completedSectionIds?: string[];
      modules?: Partial<Record<RiderType, RiderModuleData>>;
      stagePlot?: StagePlotConfig;
    } | undefined;

    return new Rider({
      id: row.id,
      title: row.title || RIDER_DATA[rType]?.title || 'Rider',
      artistName: row.artist_name === 'Nuevo Artista / Banda' ? '' : (row.artist_name || ''),
      type: rType,
      season: meta?.season || '',
      venue: row.venue_name || '',
      version: row.version || 'v1.0',
      status: row.status === 'completed' ? 'completed' : 'in_progress',
      sections,
      channels,
      completedSectionIds: Array.isArray(meta?.completedSectionIds)
        ? meta.completedSectionIds
        : [],
      linkedSessions,
      modules: meta?.modules || {},
      stagePlot: meta?.stagePlot || meta?.modules?.tecnico?.stagePlot || {
        stageWidth: 12.0,
        stageDepth: 10.0,
        stageHeight: 1.5,
        elements: []
      },
      updatedAt: row.updated_at || row.created_at || ''
    });
  }

  /**
   * Porcentaje de completado de las secciones del rider activo
   */
  public getProgress(): number {
    if (this.sections.length === 0) return 0;
    return Math.round((this.completedSectionIds.length / this.sections.length) * 100);
  }

  /**
   * Estadísticas de progreso por cada uno de los 3 módulos del Rider General
   */
  public getModuleStats(): Record<RiderType, { completed: number; total: number; percent: number }> {
    const types: RiderType[] = ['tecnico', 'hospitality', 'seguridad'];
    const result = {} as Record<RiderType, { completed: number; total: number; percent: number }>;

    types.forEach((t) => {
      let sectionsCount = 0;
      let completedCount = 0;

      if (this.type === t) {
        sectionsCount = this.sections.length;
        completedCount = this.completedSectionIds.length;
      } else if (this.modules[t] && this.modules[t]!.sections.length > 0) {
        sectionsCount = this.modules[t]!.sections.length;
        completedCount = this.modules[t]!.completedSectionIds?.length || 0;
      } else {
        sectionsCount = RIDER_DATA[t]?.sections?.length || 0;
        completedCount = 0;
      }

      result[t] = {
        completed: completedCount,
        total: sectionsCount,
        percent: sectionsCount > 0 ? Math.round((completedCount / sectionsCount) * 100) : 0
      };
    });

    return result;
  }

  /**
   * Progreso global del Master Production Rider (los 3 módulos combinados)
   */
  public getMasterProgress(): { completed: number; total: number; percent: number } {
    const stats = this.getModuleStats();
    const completed = stats.tecnico.completed + stats.hospitality.completed + stats.seguridad.completed;
    const total = stats.tecnico.total + stats.hospitality.total + stats.seguridad.total;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }

  public isSectionCompleted(sectionId: string): boolean {
    return this.completedSectionIds.includes(sectionId);
  }

  public toggleSectionCompletion(sectionId: string): void {
    if (this.isSectionCompleted(sectionId)) {
      this.completedSectionIds = this.completedSectionIds.filter(id => id !== sectionId);
    } else {
      this.completedSectionIds = [...this.completedSectionIds, sectionId];
    }
    this.status = this.completedSectionIds.length === this.sections.length ? 'completed' : 'in_progress';
    this.syncCurrentModule();
  }

  /**
   * Sincroniza el estado del módulo activo dentro del diccionario general de módulos
   */
  public syncCurrentModule(): void {
    this.modules[this.type] = {
      sections: this.sections,
      channels: this.channels.map(c => (typeof c?.toJSON === 'function' ? c.toJSON() : c)),
      completedSectionIds: [...this.completedSectionIds],
      stagePlot: this.type === 'tecnico' ? this.stagePlot : this.modules[this.type]?.stagePlot
    };
  }

  /**
   * Métodos de gestión y edición del Stage Plot 2D
   */
  public updateStagePlot(updates: Partial<StagePlotConfig>): void {
    this.stagePlot = {
      ...this.stagePlot,
      ...updates
    };
    this.syncCurrentModule();
  }

  public addStageElement(element: Omit<StageElement, 'id'>): StageElement {
    const newEl: StageElement = {
      ...element,
      id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    };
    this.stagePlot.elements.push(newEl);
    this.syncCurrentModule();
    return newEl;
  }

  public updateStageElement(id: string, updates: Partial<StageElement>): void {
    this.stagePlot.elements = this.stagePlot.elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
    this.syncCurrentModule();
  }

  public deleteStageElement(id: string): void {
    this.stagePlot.elements = this.stagePlot.elements.filter(el => el.id !== id);
    this.syncCurrentModule();
  }

  public resetStagePlot(empty = false): void {
    const config: StagePlotConfig = empty
      ? { stageWidth: 12.0, stageDepth: 10.0, stageHeight: 1.5, elements: [] }
      : JSON.parse(JSON.stringify(DEFAULT_STAGE_PLOT));
    this.stagePlot = config;
    if (this.modules?.tecnico) {
      this.modules.tecnico.stagePlot = JSON.parse(JSON.stringify(config));
    }
    this.syncCurrentModule();
  }

  /**
   * Restablece el módulo activo y el rider completo desde ceros:
   * - Restaura las secciones de la estructura base pero totalmente vacías (content: '')
   * - Limpia artista, temporada y recinto
   * - Restablece el Stage Plot 2D a un plano en blanco sin instrumentos precargados
   * - Limpia los canales del Input List y marcas de completitud
   * - Sincroniza todos los módulos a un estado limpio sin valores por defecto
   */
  public resetFromScratch(): void {
    this.artistName = '';
    this.season = '';
    this.venue = '';
    this.completedSectionIds = [];
    this.channels = [];

    // 1. Limpiar secciones del módulo activo (conservando estructura pero sin texto por defecto)
    const currentTemplate = RIDER_DATA[this.type] || RIDER_DATA.tecnico;
    this.title = currentTemplate.title || 'Rider de Producción';
    this.sections = (currentTemplate.sections || []).map(s => ({
      ...s,
      content: ''
    }));
    this.renumberSections();

    // 2. Limpiar Stage Plot a un escenario en blanco sin elementos por defecto
    this.stagePlot = {
      stageWidth: 12.0,
      stageDepth: 10.0,
      stageHeight: 1.5,
      elements: []
    };

    // 3. Limpiar todos los módulos secundarios (hospitality, seguridad, técnico)
    const types: RiderType[] = ['tecnico', 'hospitality', 'seguridad'];
    types.forEach((t) => {
      const tTemplate = RIDER_DATA[t];
      this.modules[t] = {
        sections: (tTemplate?.sections || []).map(s => ({ ...s, content: '' })),
        channels: [],
        completedSectionIds: [],
        stagePlot: t === 'tecnico' ? { ...this.stagePlot } : undefined
      };
    });

    this.syncCurrentModule();
  }

  /**
   * Obtiene la información completa de cualquier módulo (activo o en segundo plano)
   */
  public getModule(type: RiderType): RiderModuleData {
    if (this.type === type) {
      return {
        sections: this.sections,
        channels: this.channels.map(c => (typeof c?.toJSON === 'function' ? c.toJSON() : c)),
        completedSectionIds: [...this.completedSectionIds]
      };
    }

    if (this.modules[type] && this.modules[type]!.sections && this.modules[type]!.sections.length > 0) {
      return this.modules[type]!;
    }

    const template = RIDER_DATA[type];
    const initialSections = (template?.sections || []).map(s => ({ ...s, content: '' }));
    return {
      sections: initialSections,
      channels: [],
      completedSectionIds: []
    };
  }

  /**
   * Retorna el conjunto unificado de los 3 módulos del Rider General
   */
  public getAllModules(): Record<RiderType, RiderModuleData> {
    return {
      tecnico: this.getModule('tecnico'),
      hospitality: this.getModule('hospitality'),
      seguridad: this.getModule('seguridad')
    };
  }

  /**
   * Reenumera secuencialmente las secciones del módulo activo (01, 02, 03...)
   */
  public renumberSections(): void {
    this.sections = this.sections.map((sec, idx) => ({
      ...sec,
      num: String(idx + 1).padStart(2, '0')
    }));
  }

  /**
   * Reordena las secciones y actualiza su numeración secuencial
   */
  public reorderSections(newSections: SectionItem[]): void {
    this.sections = newSections.map((sec, idx) => ({
      ...sec,
      num: String(idx + 1).padStart(2, '0')
    }));
    this.syncCurrentModule();
  }

  public addSection(section: Omit<SectionItem, 'id' | 'num'>): SectionItem {
    const num = String(this.sections.length + 1).padStart(2, '0');
    const newSec: SectionItem = {
      ...section,
      id: `custom-${Date.now()}`,
      num
    };
    this.sections.push(newSec);
    this.renumberSections();
    this.syncCurrentModule();
    return newSec;
  }

  public updateSection(sectionId: string, updates: Partial<SectionItem>): void {
    this.sections = this.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s);
    this.syncCurrentModule();
  }

  public deleteSection(sectionId: string): void {
    this.sections = this.sections.filter(s => s.id !== sectionId);
    this.completedSectionIds = this.completedSectionIds.filter(id => id !== sectionId);
    this.renumberSections();
    this.syncCurrentModule();
  }

  /**
   * Reenumera secuencialmente los canales de tarima (01, 02, 03...)
   */
  public renumberChannels(): void {
    this.channels = this.channels.map((c, idx) => {
      const chNum = String(idx + 1).padStart(2, '0');
      return new ChannelInput(
        c.id,
        chNum,
        c.name,
        c.mic,
        c.stand,
        c.altMic,
        c.phantom,
        c.subSnake
      );
    });
  }

  public addChannel(name = 'Nuevo Canal', mic = 'Shure SM58', stand = 'Pie Standard'): ChannelInput {
    const chNum = String(this.channels.length + 1).padStart(2, '0');
    const newCh = ChannelInput.create(chNum, name, mic, stand);
    this.channels.push(newCh);
    this.renumberChannels();
    this.syncCurrentModule();
    return newCh;
  }

  public updateChannel(channelId: string, updates: Partial<ChannelData>): void {
    this.channels = this.channels.map(c => {
      if (c.id === channelId) {
        return new ChannelInput(
          c.id,
          updates.ch ?? c.ch,
          updates.name ?? c.name,
          updates.mic ?? c.mic,
          updates.stand ?? c.stand,
          updates.altMic !== undefined ? updates.altMic : c.altMic,
          updates.phantom !== undefined ? updates.phantom : c.phantom,
          updates.subSnake !== undefined ? updates.subSnake : c.subSnake
        );
      }
      return c;
    });
    this.syncCurrentModule();
  }

  public deleteChannel(channelId: string): void {
    this.channels = this.channels.filter(c => c.id !== channelId);
    this.renumberChannels();
    this.syncCurrentModule();
  }

  /**
   * Cambia el módulo activo preservando artista, temporada, recinto y el estado de cada tipo.
   */
  public switchType(targetType: RiderType): void {
    if (this.type === targetType) return;

    // 1. Guardar estado del módulo actual
    this.modules[this.type] = {
      sections: JSON.parse(JSON.stringify(this.sections)),
      channels: this.channels.map(c => (typeof c?.toJSON === 'function' ? c.toJSON() : c)),
      completedSectionIds: [...this.completedSectionIds]
    };

    // 2. Establecer nuevo tipo manteniendo el artista en el título
    this.type = targetType;
    const template = RIDER_DATA[targetType];
    this.title = this.artistName?.trim()
      ? `${template.title} - ${this.artistName.trim()}`
      : template.title;

    // 3. Restaurar módulo si ya existía o cargar la plantilla en blanco
    if (this.modules[targetType] && this.modules[targetType]!.sections.length > 0) {
      const existing = this.modules[targetType]!;
      this.sections = existing.sections;
      this.channels = (existing.channels || []).map((c, idx) =>
        c instanceof ChannelInput ? c : ChannelInput.fromData(c, idx)
      );
      this.completedSectionIds = existing.completedSectionIds || [];
    } else {
      this.sections = template.sections.map(s => ({ ...s, content: '' }));
      this.channels = [];
      this.completedSectionIds = [];
      this.modules[targetType] = {
        sections: this.sections,
        channels: this.channels,
        completedSectionIds: this.completedSectionIds
      };
    }

    this.renumberSections();
    this.renumberChannels();
  }

  /**
   * Prepara el payload para persistir en la API o Supabase
   */
  public toDatabasePayload(): object {
    // Sincronizar módulo actual en el diccionario de módulos antes de guardar
    this.modules[this.type] = {
      sections: this.sections,
      channels: this.channels.map(c => (typeof c?.toJSON === 'function' ? c.toJSON() : c)),
      completedSectionIds: this.completedSectionIds,
      stagePlot: this.type === 'tecnico' ? this.stagePlot : this.modules[this.type]?.stagePlot
    };

    return {
      id: this.id && !this.id.startsWith('r-') && !this.id.startsWith('custom-') ? this.id : undefined,
      title: this.title || 'Rider de Producción',
      artist_name: this.artistName?.trim() || 'Nuevo Artista / Banda',
      rider_type: this.type,
      venue_name: this.venue ? this.venue.trim() : null,
      version: this.version || 'v1.0',
      status: this.status || 'in_progress',
      channels: this.channels.map(c => (typeof c?.toJSON === 'function' ? c.toJSON() : c)),
      sections: this.sections,
      metadata: {
        season: this.season,
        completedSectionIds: this.completedSectionIds,
        modules: this.modules,
        stagePlot: this.stagePlot
      }
    };
  }

  public toSummary(): SavedRiderSummary {
    return {
      id: this.id,
      title: this.title,
      artist: this.artistName,
      tour: this.season,
      type: this.type,
      progress: this.getProgress(),
      sectionsCompleted: this.completedSectionIds.length,
      totalSections: this.sections.length,
      status: this.status,
      lastEdited: new Date(this.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channels: this.channels.map(c => c.toJSON()),
      sections: this.sections,
      linkedSessions: this.linkedSessions
    };
  }
}
