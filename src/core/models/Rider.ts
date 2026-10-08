import { RiderType, SectionItem, ChannelData, SavedRiderSummary, LinkedChatSession } from '../types/rider.types';
import { RIDER_DATA } from '../constants/rider-templates';
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
      completedSectionIds: []
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
      : RIDER_DATA[rType]?.sections || [];

    const linkedSessions: LinkedChatSession[] = Array.isArray(row.chat_sessions)
      ? row.chat_sessions.map((cs) => ({
          id: cs.id,
          title: cs.title,
          updatedAt: cs.updated_at
        }))
      : [];

    const meta = row.metadata as { season?: string; completedSectionIds?: string[] } | undefined;

    return new Rider({
      id: row.id,
      title: row.title || RIDER_DATA[rType]?.title || 'Rider',
      artistName: row.artist_name || '',
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
      updatedAt: row.updated_at || row.created_at || ''
    });
  }

  /**
   * Porcentaje de completado de las secciones del rider
   */
  public getProgress(): number {
    if (this.sections.length === 0) return 0;
    return Math.round((this.completedSectionIds.length / this.sections.length) * 100);
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
  }

  public addSection(section: Omit<SectionItem, 'id' | 'num'>): SectionItem {
    const num = String(this.sections.length + 1).padStart(2, '0');
    const newSec: SectionItem = {
      ...section,
      id: `custom-${Date.now()}`,
      num
    };
    this.sections.push(newSec);
    return newSec;
  }

  public updateSection(sectionId: string, updates: Partial<SectionItem>): void {
    this.sections = this.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s);
  }

  public deleteSection(sectionId: string): void {
    this.sections = this.sections.filter(s => s.id !== sectionId);
    this.completedSectionIds = this.completedSectionIds.filter(id => id !== sectionId);
  }

  public addChannel(name = 'Nuevo Canal', mic = 'Shure SM58', stand = 'Pie Standard'): ChannelInput {
    const chNum = String(this.channels.length + 1).padStart(2, '0');
    const newCh = ChannelInput.create(chNum, name, mic, stand);
    this.channels.push(newCh);
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
          updates.stand ?? c.stand
        );
      }
      return c;
    });
  }

  public deleteChannel(channelId: string): void {
    this.channels = this.channels.filter(c => c.id !== channelId);
  }

  /**
   * Prepara el payload para persistir en la API o Supabase
   */
  public toDatabasePayload(): object {
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
        completedSectionIds: this.completedSectionIds
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
