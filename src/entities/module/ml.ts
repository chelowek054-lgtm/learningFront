// Метаданные модуля «Программирование/ML». ЧИСТЫЕ данные — без рендереров/RN.
// Типы Activity из docs/architecture/03-functional.md §2.1.
import type { ActivityTypeDef } from '@/shared/engine';
import { translate } from '../../shared/i18n-core';

export const ML_MODULE_ID = 'ml';
export const ML_MODULE_TITLE = 'Программирование / ML';

// title/hint описывают задачу человека, а не механизм: «Вспомнить», а не
// «concept_recall». Это единственное место, где живёт название типа.
export const mlActivityTypes: ActivityTypeDef[] = [
  {
    type: 'material_read',
    get title() {
      return translate('act.material_read.title');
    },
    get hint() {
      return translate('act.material_read.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'concept_recall',
    get title() {
      return translate('act.concept_recall.title');
    },
    get hint() {
      return translate('act.concept_recall.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'concept_srs',
    get title() {
      return translate('act.concept_srs.title');
    },
    get hint() {
      return translate('act.concept_srs.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'code_task',
    get title() {
      return translate('act.code_task.title');
    },
    get hint() {
      return translate('act.code_task.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
];
