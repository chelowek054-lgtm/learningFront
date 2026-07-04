// Метаданные модуля «Языки» (TOEFL/IELTS). ЧИСТЫЕ данные — без рендереров/RN.
// Типы Activity из docs/architecture/03-functional.md §1.1.
import type { ActivityTypeDef } from '@/shared/engine';

export const LANGUAGES_MODULE_ID = 'languages';
export const LANGUAGES_MODULE_TITLE = 'Языки';

export const languagesActivityTypes: ActivityTypeDef[] = [
  {
    type: 'ielts_writing_task2',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'ielts_writing_task1',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  { type: 'reading_drill', connectivity: 'offline', payloadSchema: {} },
  { type: 'listening_drill', connectivity: 'offline', payloadSchema: {} },
  // Speaking — Фаза 2 (STT), тип объявлен заранее.
  { type: 'speaking_response', connectivity: 'online', payloadSchema: {}, producesErrorLog: true },
  { type: 'vocab_srs', connectivity: 'offline', payloadSchema: {} },
];
