// Метаданные модуля «Языки» (TOEFL/IELTS). ЧИСТЫЕ данные — без рендереров/RN.
// Типы Activity из docs/architecture/03-functional.md §1.1.
import type { ActivityTypeDef } from '@/shared/engine';
import { translate } from '../../shared/i18n/translate';

export const LANGUAGES_MODULE_ID = 'languages';
export const LANGUAGES_MODULE_TITLE = 'Языки';

export const languagesActivityTypes: ActivityTypeDef[] = [
  {
    type: 'ielts_writing_task2',
    get title() {
      return translate('act.ielts_writing_task2.title');
    },
    get hint() {
      return translate('act.ielts_writing_task2.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'toefl_writing_independent',
    get title() {
      return translate('act.toefl_writing_independent.title');
    },
    get hint() {
      return translate('act.toefl_writing_independent.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'toefl_writing_integrated',
    get title() {
      return translate('act.toefl_writing_integrated.title');
    },
    get hint() {
      return translate('act.toefl_writing_integrated.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'ielts_writing_task1',
    get title() {
      return translate('act.ielts_writing_task1.title');
    },
    get hint() {
      return translate('act.ielts_writing_task1.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'reading_drill',
    get title() {
      return translate('act.reading_drill.title');
    },
    get hint() {
      return translate('act.reading_drill.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'listening_drill',
    get title() {
      return translate('act.listening_drill.title');
    },
    get hint() {
      return translate('act.listening_drill.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
  // Speaking — Фаза 2 (STT), тип объявлен заранее.
  {
    type: 'speaking_response',
    get title() {
      return translate('act.speaking_response.title');
    },
    get hint() {
      return translate('act.speaking_response.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'vocab_srs',
    get title() {
      return translate('act.vocab_srs.title');
    },
    get hint() {
      return translate('act.vocab_srs.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
];
