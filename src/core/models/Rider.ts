import { RiderType, SectionItem, ChannelData, SavedRiderSummary } from '../types/rider.types';
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
    updatedAt?: string;
  }) {
    this.type = params.type || 'tecnico';
    const template = RIDER_DATA[this.type];
    
    this.id = params.id || '';
    this.title = params.title || template.title;
    this.artistName = params.artistName || 'Nuevo Artista / Banda';
    this.season = params.season || 'Temporada 2026';
    this.venue = params.venue || 'Venue Principal';
    this.version = params.version || 'v1.0';
    this.status = params.status || 'in_progress';
    this.sections = params.sections && params.sections.length > 0 
      ? JSON.parse(JSON.stringify(params.sections))
      : JSON.parse(JSON.stringify(template.sections));
    
    this.channels = (params.channels || []).map((c, idx) => 
      c instanceof ChannelInput ? c : ChannelInput.fromData(c, idx)
    );
    this.completedSectionIds = params.completedSectionIds || [];
    this.updatedAt = params.updatedAt || new Date().toISOString();
  }

  /**
   * Crea una instancia en blanco a partir de la plantilla guía por tipo
   */
  public static createBlank(type: RiderType = 'tecnico'): Rider {
    const template = RIDER_DATA[type];
    let initialChannels: ChannelInput[] = [];

    if (type === 'tecnico') {
      initialChannels = [
        ChannelInput.create('01', 'Voz Principal (Lead Vocal)', 'Shure KSM9 / SM58', 'Pie Jirafa'),
        ChannelInput.create('02', 'Guitarra / Instrumento Línea', 'Radial J48 DI / SM57', 'Atril bajo')
      ];
    }

    return new Rider({
      id: '',
      title: template.title,
      artistName: 'Nuevo Artista / Banda',
      type,
      season: 'Temporada 2026',
      sections: template.sections,
      channels: initialChannels,
      completedSectionIds: []
    });
  }

  /**
   * Crea una instancia de dominio desde un registro de base de datos
   */
  public static fromDatabase(row: any): Rider {
    const rType: RiderType = (row.rider_type as RiderType) || 'tecnico';
    const channels = Array.isArray(row.channels) ? row.channels : [];
    const sections = Array.isArray(row.sections) && row.sections.length > 0
      ? row.sections
      : RIDER_DATA[rType]?.sections || [];

    return new Rider({
      id: row.id,
      title: row.title || RIDER_DATA[rType]?.title || 'Rider',
      artistName: row.artist_name || 'Nuevo Artista / Banda',
      type: rType,
      season: row.metadata?.season || 'Temporada 2026',
      venue: row.venue_name || 'Venue Principal',
      version: row.version || 'v1.0',
      status: row.status === 'completed' ? 'completed' : 'in_progress',
      sections,
      channels,
      completedSectionIds: Array.isArray(row.metadata?.completedSectionIds)
        ? row.metadata.completedSectionIds
        : [],
      updatedAt: row.updated_at || row.created_at || new Date().toISOString()
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
      id: this.id && !this.id.startsWith('r-') ? this.id : undefined,
      title: this.title,
      artist_name: this.artistName,
      rider_type: this.type,
      venue_name: this.venue,
      version: this.version,
      status: this.status,
      channels: this.channels.map(c => c.toJSON()),
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
      sections: this.sections
    };
  }
}
