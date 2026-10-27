export type StandardsFamilyId =
  | 'sistema_pa'
  | 'procesamiento'
  | 'medicion'
  | 'consola_foh'
  | 'perifericos_foh'
  | 'consola_monitores'
  | 'personal_audio'
  | 'transporte_terrestre';

export type StandardsMode = 'chat' | 'review';

export interface CatalogRow {
  [column: string]: string | undefined;
}

export interface CatalogTable {
  titulo: string;
  notas?: string[];
  columnas?: string[] | null;
  filas: CatalogRow[];
}

export interface StandardDato {
  id: string;
  dato: string;
  que_debe_decir: string;
  ejemplo_o_error?: string;
}

export interface StandardRegla {
  codigo: string;
  texto: string;
  estado: string;
}

export interface StandardFamily {
  id: string;
  nombre: string;
  prefijo_datos: string;
  prefijo_reglas: string;
  introduccion?: string[];
  datos_que_se_piden: StandardDato[];
  reglas: StandardRegla[];
  catalogo: CatalogTable[];
  texto_modelo?: {
    es?: string;
    en?: string;
  };
}

export interface StandardPart {
  titulo: string;
  archivo_contexto?: string;
  familias: StandardFamily[];
}

export interface RiderStandardsCatalog {
  documento: string;
  version: string;
  idioma?: string;
  partes: StandardPart[];
  valores: Record<string, Record<string, string>>;
  glosario_envios: Record<string, string>;
}

export interface BuildStandardsContextInput {
  mode: StandardsMode;
  riderType?: string;
  query?: string;
  sectionTitle?: string;
  sectionText?: string;
  selection?: string;
  sectionTitles?: string[];
  maxChars?: number;
}
