/**
 * Tipos de datos para el sistema de generación asistida de riders con LLM.
 */

import { ChannelData, SectionItem, RiderType } from './rider.types';

export type ShowFormat = 'full_band' | 'acoustic' | 'dj_electronic' | 'urban_tracks' | 'orchestra' | 'trio_quartet';

export type VenueScale = 'club_theater' | 'arena_stadium' | 'festival_mainstage' | 'corporate_private';

export type MonitoringPreference = 'in_ear_only' | 'wedges_only' | 'hybrid_iem_and_wedges';

export interface RiderGenerationParameters {
  artistName: string;
  tourOrShowName: string;
  format: ShowFormat;
  genre: string;
  venueScale: VenueScale;
  monitoring: MonitoringPreference;
  musiciansCount: number;
  hasOwnSoundEngineer: boolean;
  notesOrSpecificGear?: string;
}

export interface GeneratedRiderResult {
  riderType: RiderType;
  title: string;
  artist: string;
  tour: string;
  sections: SectionItem[];
  channels: ChannelData[];
  executiveSummary: string;
  qualityScoreEstimated: number;
}
