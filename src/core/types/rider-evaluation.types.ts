/**
 * Tipos de datos para el sistema de evaluación y auditoría de riders con LLM.
 */

export type RiderQualityGrade = 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'DEFICIENTE';

export type RedFlagSeverity = 'CRITICA' | 'ALTA' | 'MEDIA';

export type RedFlagType =
  | 'WATTS_COMO_POTENCIA'
  | 'HOSPITALIDAD_MEZCLADA'
  | 'SIN_INPUT_LIST'
  | 'SIN_STAGE_PLOT'
  | 'SIN_CONTACTOS'
  | 'INFLEXIBLE_SIN_ALTERNATIVAS'
  | 'INCOHERENCIA_CRUZADA'
  | 'ELECTRICO_SIN_TIERRA_AISLADA';

export interface DimensionScore {
  puntaje: number;
  maximo: number;
  observaciones: string;
}

export interface EvaluationDimensions {
  completitud_y_estructura: DimensionScore;
  rigor_electroacustico: DimensionScore;
  input_output_lists: DimensionScore;
  stage_plot_y_electricidad: DimensionScore;
  viabilidad_contra_rider: DimensionScore;
}

export interface RiderRedFlag {
  tipo: RedFlagType;
  descripcion: string;
  severidad: RedFlagSeverity;
}

export interface RiderInconsistency {
  descripcion: string;
}

export interface GeneralEvaluation {
  puntaje_global: number;
  calificacion: RiderQualityGrade;
  resumen_ejecutivo: string;
}

export interface RiderEvaluationReport {
  evaluacion_general: GeneralEvaluation;
  desglose_dimensiones: EvaluationDimensions;
  banderas_rojas_detectadas: RiderRedFlag[];
  inconsistencias_detectadas: RiderInconsistency[];
  elementos_faltantes_criticos: string[];
  recomendaciones_para_proveedor: string[];
}
