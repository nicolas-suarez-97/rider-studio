import { z } from 'zod';

export const ChannelDataSchema = z.object({
  id: z.string().optional(),
  ch: z.string().optional(),
  name: z.string().optional(),
  mic: z.string().optional(),
  stand: z.string().optional()
});

export const SectionItemSchema = z.object({
  id: z.string(),
  num: z.string(),
  title: z.string(),
  subtitle: z.string(),
  tag: z.string(),
  tagColor: z.string(),
  iconName: z.string(),
  content: z.string().optional()
});

export const SaveRiderPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'El título es requerido').max(255),
  artist_name: z.string().min(1, 'El nombre del artista es requerido').max(255),
  rider_type: z.enum(['tecnico', 'hospitality', 'seguridad']).optional().default('tecnico'),
  venue_name: z.string().nullable().optional(),
  event_date: z.string().nullable().optional(),
  version: z.string().optional().default('v1.0'),
  status: z.enum(['draft', 'in_progress', 'completed']).optional().default('draft'),
  channels: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  sections: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
});

export type SaveRiderPayload = z.infer<typeof SaveRiderPayloadSchema>;
