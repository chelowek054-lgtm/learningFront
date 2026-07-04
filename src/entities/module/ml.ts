// Метаданные модуля «Программирование/ML». ЧИСТЫЕ данные — без рендереров/RN.
// Типы Activity из docs/architecture/03-functional.md §2.1.
import type { ActivityTypeDef } from '@/shared/engine';

export const ML_MODULE_ID = 'ml';
export const ML_MODULE_TITLE = 'Программирование / ML';

export const mlActivityTypes: ActivityTypeDef[] = [
  { type: 'material_read', connectivity: 'offline', payloadSchema: {} },
  { type: 'concept_recall', connectivity: 'online', payloadSchema: {}, producesErrorLog: true },
  { type: 'concept_srs', connectivity: 'offline', payloadSchema: {} },
  { type: 'code_task', connectivity: 'online', payloadSchema: {}, producesErrorLog: true },
];
