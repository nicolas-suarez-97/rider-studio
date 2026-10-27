import { 
  RiderType, 
  RiderDocumentTheme,
  SectionItem, 
  ChannelData, 
  SavedRiderSummary, 
  LinkedChatSession,
  StagePlotConfig,
  StageElement,
  RiderModuleData,
  RiderMediaItem,
  AbsoluteExclusion
} from '../types/rider.types';
import { readAbsoluteExclusions } from '@/lib/share/exclusions';
import { defaultDocumentTheme, isRiderDocumentTheme } from '../constants/document-themes';
import { RIDER_TYPE_ORDER } from '../constants/rider-type-tokens';
import { flattenTypedSections, sectionType } from '../utils/type-view';
import { coverMedia, parseRiderMedia, MAX_GALLERY_IMAGES } from '@/lib/media/rider-media';
import { inputListDoc } from '../constants/input-list';
import {
  insertWorkAreasSection,
  WORK_AREAS_SECTION_ID,
  workAreasDoc,
} from '../constants/work-areas';
import { transportFleetDoc } from '../constants/transporte-terrestre';
import { isDocumentIntro, isDocumentCover, DOCUMENT_COVER_ID, buildCoverContentDoc } from '../editor/content-doc';
import { RIDER_DATA } from '../constants/rider-templates';
import { migratePaConsolasHierarchy } from '../constants/section-hierarchy';
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
  public documentTheme: RiderDocumentTheme;
  public status: 'completed' | 'in_progress';
  public sections: SectionItem[];
  public channels: ChannelInput[];
  public completedSectionIds: string[];
  public linkedSessions: LinkedChatSession[];
  public updatedAt: string;
  public modules: Partial<Record<RiderType, RiderModuleData>>;
  public stagePlot: StagePlotConfig;
  public media: RiderMediaItem[];
  public absoluteExclusions: AbsoluteExclusion[];

  constructor(params: {
    id?: string;
    title?: string;
    artistName?: string;
    type?: RiderType;
    season?: string;
    venue?: string;
    version?: string;
    documentTheme?: RiderDocumentTheme;
    status?: 'completed' | 'in_progress';
    sections?: SectionItem[];
    channels?: (ChannelData | ChannelInput)[];
    completedSectionIds?: string[];
    linkedSessions?: LinkedChatSession[];
    updatedAt?: string;
    modules?: Partial<Record<RiderType, RiderModuleData>>;
    stagePlot?: StagePlotConfig;
    media?: RiderMediaItem[];
    absoluteExclusions?: AbsoluteExclusion[];
  }) {
    this.type = params.type || 'tecnico';
    const template = RIDER_DATA[this.type];
    
    this.id = params.id || '';
    this.title = params.title || template.title;
    this.artistName = params.artistName !== undefined ? params.artistName : '';
    this.season = params.season !== undefined ? params.season : '';
    this.venue = params.venue !== undefined ? params.venue : '';
    this.version = params.version || 'v1.0';
    this.documentTheme = isRiderDocumentTheme(params.documentTheme)
      ? params.documentTheme
      : defaultDocumentTheme();
    this.status = params.status || 'in_progress';
    this.sections = Array.isArray(params.sections)
      ? JSON.parse(JSON.stringify(params.sections))
      : [];
    
    this.channels = (params.channels || []).map((c, idx) => 
      c instanceof ChannelInput ? c : ChannelInput.fromData(c, idx)
    );
    this.completedSectionIds = params.completedSectionIds || [];
    this.linkedSessions = params.linkedSessions || [];
    this.updatedAt = params.updatedAt || '';
    this.modules = params.modules || {};
    this.media = parseRiderMedia(params.media);
    this.absoluteExclusions = Array.isArray(params.absoluteExclusions)
      ? params.absoluteExclusions
          .map((item) => ({
            id: item.id,
            brand: (item.brand || '').trim(),
            ...(item.model?.trim() ? { model: item.model.trim() } : {}),
          }))
          .filter((item) => item.id && item.brand)
      : [];

    this.stagePlot = params.stagePlot
      ? JSON.parse(JSON.stringify(params.stagePlot))
      : (this.modules?.tecnico?.stagePlot
        ? JSON.parse(JSON.stringify(this.modules.tecnico.stagePlot))
        : JSON.parse(JSON.stringify(DEFAULT_STAGE_PLOT)));

    this.unifyDocument();
    this.sections = insertWorkAreasSection(this.sections);
    this.renumberSections();
    this.renumberChannels();
    this.syncCurrentModule();
  }

  /**
   * One document per show: sections from every module become a single ordered list,
   * each stamped with its type. Legacy `metadata.modules` stay available on save.
   */
  private unifyDocument(): void {
    this.sections = migratePaConsolasHierarchy(
      flattenTypedSections(this.sections, this.type, this.modules),
    );

    if (this.type !== 'tecnico') {
      const tecnico = this.modules.tecnico;
      if ((tecnico?.channels || []).length > 0 && this.channels.length === 0) {
        this.channels = (tecnico?.channels || []).map((channel, index) => (
          channel instanceof ChannelInput ? channel : ChannelInput.fromData(channel, index)
        ));
      }
      if (tecnico?.stagePlot) {
        this.stagePlot = JSON.parse(JSON.stringify(tecnico.stagePlot));
      }
    }

    this.syncCurrentModule();
  }

  /**
   * Crea una instancia en blanco a partir de la plantilla guía por tipo.
   * Sin información pre-llenada: artista, temporada, canales vacíos y
   * secciones base con contenido en blanco listas para redactar.
   */
  public static createBlank(type: RiderType = 'tecnico'): Rider {
    const template = RIDER_DATA[type];
    
    return new Rider({
      id: '',
      title: template?.title || 'Rider de Producción',
      artistName: '',
      type,
      season: '',
      venue: '',
      sections: [],
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
    media?: unknown;
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
    const sections = Array.isArray(row.sections)
      ? (row.sections as SectionItem[])
      : [];

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
      media?: unknown;
      documentTheme?: unknown;
      absoluteExclusions?: AbsoluteExclusion[];
    } | undefined;

    const columnMedia = parseRiderMedia(row.media);
    const media = columnMedia.length > 0 ? columnMedia : parseRiderMedia(meta?.media);

    return new Rider({
      id: row.id,
      title: row.title || RIDER_DATA[rType]?.title || 'Rider',
      artistName: row.artist_name === 'Nuevo Artista / Banda' ? '' : (row.artist_name || ''),
      type: rType,
      season: meta?.season || '',
      venue: row.venue_name || '',
      version: row.version || 'v1.0',
      documentTheme: isRiderDocumentTheme(meta?.documentTheme) ? meta.documentTheme : undefined,
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
      media,
      absoluteExclusions: readAbsoluteExclusions(row.metadata as Parameters<typeof readAbsoluteExclusions>[0]),
      updatedAt: row.updated_at || row.created_at || ''
    });
  }

  /**
   * Un módulo cuenta como escrito si alguna sección tiene texto o, en técnico, hay canales.
   * La plantilla en blanco y el plano por defecto no cuentan como contenido.
   */
  public hasModuleContent(type: RiderType): boolean {
    const data = this.getModule(type);
    const hasText = (data.sections || []).some((section) => (section.content || '').trim().length > 0);
    const hasChannels = type === 'tecnico' && (data.channels || []).length > 0;
    return hasText || hasChannels;
  }

  /**
   * Módulos visibles al leer. Técnico se mantiene; hospitality y seguridad solo si tienen texto o canales.
   */
  public getReadableTypes(): RiderType[] {
    const optional: RiderType[] = ['hospitality', 'seguridad'];
    return ['tecnico', ...optional.filter((type) => this.hasModuleContent(type))];
  }

  /**
   * Porcentaje de completado de las secciones del rider activo
   */
  private outlineSections() {
    return this.sections.filter((section) => !isDocumentIntro(section.id));
  }

  public getProgress(): number {
    const total = this.outlineSections().length;
    if (total === 0) return 0;
    const completed = this.completedSectionIds.filter((id) => !isDocumentIntro(id)).length;
    return Math.round((completed / total) * 100);
  }

  /**
   * Estadísticas de progreso por cada uno de los 3 módulos del Rider General
   */
  public getModuleStats(): Record<RiderType, { completed: number; total: number; percent: number }> {
    const types: RiderType[] = ['tecnico', 'hospitality', 'seguridad'];
    const result = {} as Record<RiderType, { completed: number; total: number; percent: number }>;

    types.forEach((t) => {
      const moduleSections = this.outlineSections().filter((section) => sectionType(section, this.type) === t);
      const ids = new Set(moduleSections.map((section) => section.id));
      const completedCount = this.completedSectionIds.filter((id) => ids.has(id) && !isDocumentIntro(id)).length;
      const sectionsCount = moduleSections.length;

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
    const channels = this.channels.map(c => (typeof c?.toJSON === 'function' ? c.toJSON() : c));
    RIDER_TYPE_ORDER.forEach((type) => {
      const sections = this.sections.filter((section) => (
        isDocumentCover(section.id) || isDocumentIntro(section.id)
          ? type === 'tecnico'
          : sectionType(section, this.type) === type
      ));
      const ids = new Set(sections.map((section) => section.id));
      this.modules[type] = {
        sections,
        channels: type === 'tecnico' ? channels : this.modules[type]?.channels,
        completedSectionIds: this.completedSectionIds.filter((id) => ids.has(id)),
        stagePlot: type === 'tecnico' ? this.stagePlot : this.modules[type]?.stagePlot
      };
    });
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

  public setReferenceImage(url: string, pathname: string): void {
    this.stagePlot = {
      ...this.stagePlot,
      referenceImageUrl: url,
      referenceImagePath: pathname,
    };
    this.syncCurrentModule();
  }

  public clearReferenceImage(): string | undefined {
    const pathname = this.stagePlot.referenceImagePath;
    const next = { ...this.stagePlot };
    delete next.referenceImageUrl;
    delete next.referenceImagePath;
    this.stagePlot = next;
    this.syncCurrentModule();
    return pathname;
  }

  public addMedia(input: { url: string; pathname: string }): RiderMediaItem {
    if (this.media.length >= MAX_GALLERY_IMAGES) {
      throw new Error('El carrusel admite hasta 8 fotos');
    }
    const item: RiderMediaItem = {
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      url: input.url,
      pathname: input.pathname,
      cover: this.media.length === 0,
    };
    this.media = [...this.media, item];
    return item;
  }

  public removeMedia(id: string): string | null {
    const removed = this.media.find((item) => item.id === id) ?? null;
    this.media = this.media.filter((item) => item.id !== id);
    if (removed?.cover && this.media[0]) {
      this.media = this.media.map((item, index) => ({ ...item, cover: index === 0 }));
    }
    return removed?.pathname ?? null;
  }

  public setCover(id: string): void {
    if (!this.media.some((item) => item.id === id)) return;
    this.media = this.media.map((item) => ({ ...item, cover: item.id === id }));
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
   * - Deja cada tipo sin secciones, como un rider nuevo
   * - Limpia artista, temporada y recinto
   * - Restablece el Stage Plot 2D a un plano en blanco sin instrumentos precargados
   * - Limpia los canales del Input List y marcas de completitud
   */
  public resetFromScratch(): void {
    this.artistName = '';
    this.season = '';
    this.venue = '';
    this.completedSectionIds = [];
    this.channels = [];

    // 1. Vaciar el documento del módulo activo, igual que un rider nuevo
    const currentTemplate = RIDER_DATA[this.type] || RIDER_DATA.tecnico;
    this.title = currentTemplate.title || 'Rider de Producción';
    this.sections = [];
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
      this.modules[t] = {
        sections: [],
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
    const sections = this.sections.filter((section) => (
      !isDocumentCover(section.id) && !isDocumentIntro(section.id) && sectionType(section, this.type) === type
    ));
    const ids = new Set(sections.map((section) => section.id));
    return {
      sections,
      channels: type === 'tecnico'
        ? this.channels.map(c => (typeof c?.toJSON === 'function' ? c.toJSON() : c))
        : (this.modules[type]?.channels || []),
      completedSectionIds: this.completedSectionIds.filter((id) => ids.has(id)),
      stagePlot: type === 'tecnico' ? this.stagePlot : this.modules[type]?.stagePlot
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
   * La portada no lleva numeración numérica.
   */
  public renumberSections(): void {
    let count = 0;
    this.sections = this.sections.map((sec) => {
      if (isDocumentCover(sec.id)) {
        return {
          ...sec,
          num: '',
        };
      }
      count += 1;
      return {
        ...sec,
        num: String(count).padStart(2, '0'),
      };
    });
  }

  /**
   * Reordena las secciones y actualiza su numeración secuencial
   */
  public reorderSections(newSections: SectionItem[]): void {
    const byId = new Map(this.sections.map((sec) => [sec.id, sec]));
    let count = 0;
    this.sections = newSections.map((sec) => {
      const full = byId.get(sec.id) || sec;
      if (isDocumentCover(sec.id)) {
        return {
          ...full,
          num: '',
        };
      }
      count += 1;
      return {
        ...full,
        num: String(count).padStart(2, '0'),
      };
    });
    this.syncCurrentModule();
  }

  /**
   * Reconstruye las secciones a partir de los títulos (h2) del documento.
   * Conserva metadatos de ids que siguen existiendo y elimina los que ya no están.
   */
  public syncSectionsFromDocument(
    patches: Array<{
      id: string;
      title: string;
      content: string;
      contentDoc?: SectionItem['contentDoc'];
      pageBreakBefore?: boolean;
      negotiability?: SectionItem['negotiability'];
      negotiabilityNote?: string;
    }>,
    options?: { retainIds?: string[]; defaultType?: RiderType }
  ): void {
    const byId = new Map(this.sections.map((sec) => [sec.id, sec]));
    const baseTemplates = Object.values(RIDER_DATA).flatMap((d) => d.sections);
    const built = patches.map((patch) => {
      const current = byId.get(patch.id);
      const isCover = isDocumentCover(patch.id);
      const baseMatch = !current && !isCover
        ? baseTemplates.find(
            (b) => b.title.trim().toLowerCase() === (patch.title || '').trim().toLowerCase()
          )
        : null;
      return {
        id: patch.id,
        num: '',
        title: isCover ? 'Portada' : (patch.title || current?.title || 'Sección'),
        subtitle: current?.subtitle || baseMatch?.subtitle || '',
        tag: isCover ? 'Portada' : (current?.tag || baseMatch?.tag || 'Custom'),
        tagColor: isCover ? 'bg-zinc-100 text-zinc-600 border border-zinc-200/60' : (current?.tagColor || baseMatch?.tagColor || 'bg-zinc-100 text-zinc-600 border border-zinc-200/60'),
        iconName: isCover ? 'fileText' : (current?.iconName || baseMatch?.iconName || 'fileText'),
        content: patch.content,
        contentDoc: patch.contentDoc,
        pageBreakBefore: patch.pageBreakBefore ?? current?.pageBreakBefore ?? false,
        negotiability: patch.negotiability ?? current?.negotiability,
        negotiabilityNote: patch.negotiabilityNote ?? current?.negotiabilityNote,
        type: current?.type || options?.defaultType || this.type,
      };
    });

    const retainIds = new Set(options?.retainIds || []);
    if (retainIds.size > 0) {
      const builtById = new Map(built.map((section) => [section.id, section]));
      const seen = new Set<string>();
      const merged: SectionItem[] = [];
      for (const section of this.sections) {
        const updated = builtById.get(section.id);
        if (updated) {
          merged.push(updated);
          seen.add(section.id);
        } else if (retainIds.has(section.id)) {
          merged.push(section);
          seen.add(section.id);
        }
      }
      for (const section of built) {
        if (!seen.has(section.id)) merged.push(section);
      }
      this.sections = merged;
    } else {
      this.sections = built;
    }

    const living = new Set(this.sections.map((sec) => sec.id));
    this.completedSectionIds = this.completedSectionIds.filter((id) => living.has(id));
    this.renumberSections();
    this.syncCurrentModule();
  }

  public applyTemplateOutline(): void {
    const template = RIDER_DATA[this.type];
    const rawSections = template?.sections || [];
    const existingCover = this.sections.find((section) => isDocumentCover(section.id));
    const otherTypes = this.sections.filter((section) => (
      !isDocumentCover(section.id)
      && !isDocumentIntro(section.id)
      && sectionType(section, this.type) !== this.type
    ));
    const coverSection: SectionItem = existingCover || {
      id: DOCUMENT_COVER_ID,
      num: '',
      title: 'Portada',
      subtitle: 'Portada del rider',
      tag: 'Portada',
      tagColor: 'bg-zinc-100 text-zinc-600 border border-zinc-200/60',
      iconName: 'fileText',
      content: '',
      contentDoc: buildCoverContentDoc(this.type, this.artistName, this.title, this.version),
      pageBreakBefore: false,
    };

    const templateSections = rawSections
      .filter((section) => !isDocumentCover(section.id))
      .map((section, index) => ({
        ...section,
        content: '',
        contentDoc: section.id === 'tech-inputlist'
          ? inputListDoc()
          : section.id === WORK_AREAS_SECTION_ID
            ? workAreasDoc()
            : section.id === 'hosp-transporte'
              ? transportFleetDoc()
              : undefined,
        pageBreakBefore: index > 0,
        type: this.type,
      }));

    this.sections = flattenTypedSections(
      [coverSection, ...templateSections, ...otherTypes],
      this.type,
      {},
    );
    this.completedSectionIds = this.completedSectionIds.filter((id) => (
      this.sections.some((section) => section.id === id)
    ));
    this.renumberSections();
    this.syncCurrentModule();
  }

  public addSection(section: Omit<SectionItem, 'id' | 'num'>, afterId?: string): SectionItem {
    const num = String(this.sections.length + 1).padStart(2, '0');
    const newSec: SectionItem = {
      ...section,
      id: `custom-${Date.now()}`,
      num,
      type: section.type || this.type,
      pageBreakBefore: false,
    };
    const index = afterId ? this.sections.findIndex((item) => item.id === afterId) : -1;
    if (index >= 0) this.sections.splice(index + 1, 0, newSec);
    else this.sections.push(newSec);
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

    // 3. Restaurar módulo si ya existía; si no, empezar vacío como un rider nuevo
    if (this.modules[targetType]) {
      const existing = this.modules[targetType]!;
      this.sections = existing.sections || [];
      this.channels = (existing.channels || []).map((c, idx) =>
        c instanceof ChannelInput ? c : ChannelInput.fromData(c, idx)
      );
      this.completedSectionIds = existing.completedSectionIds || [];
    } else {
      this.sections = [];
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
    this.syncCurrentModule();

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
        documentTheme: this.documentTheme,
        completedSectionIds: this.completedSectionIds,
        modules: this.modules,
        stagePlot: this.stagePlot,
        media: this.media,
        absoluteExclusions: this.absoluteExclusions,
      },
      media: this.media,
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
      updatedAt: this.updatedAt,
      lastEdited: new Date(this.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channels: this.channels.map(c => c.toJSON()),
      sections: this.sections,
      linkedSessions: this.linkedSessions,
      coverUrl: coverMedia(this.media)?.url,
    };
  }
}
