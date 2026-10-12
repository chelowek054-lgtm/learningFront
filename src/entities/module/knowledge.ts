// Метаданные модуля «Модель знаний». ЧИСТЫЕ данные — без рендереров/RN.
// concept_recall НЕ здесь: он объявлен модулем ml и переиспользуется
// (05-knowledge-model §9), а реестр запрещает коллизии типов.
//
// А вот `srs` объявлен здесь, хотя прежний комментарий уверял, что его даёт ml.
// Это была неправда: ml объявляет `concept_srs`, а шаг курса возвращает `srs`
// (modules/knowledge/course.py). Тип, который backend отдаёт, но никто не
// объявлял, оставался без названия и рендерера.
import type { ActivityTypeDef } from '@/shared/engine';
import { translate } from '../../shared/i18n/translate';

export const KNOWLEDGE_MODULE_ID = 'knowledge';
export const KNOWLEDGE_MODULE_TITLE = 'Модель знаний';

export const knowledgeActivityTypes: ActivityTypeDef[] = [
  {
    type: 'concept_study',
    get title() {
      return translate('act.concept_study.title');
    },
    get hint() {
      return translate('act.concept_study.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'concept_contrast',
    get title() {
      return translate('act.concept_contrast.title');
    },
    get hint() {
      return translate('act.concept_contrast.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'concept_apply',
    get title() {
      return translate('act.concept_apply.title');
    },
    get hint() {
      return translate('act.concept_apply.hint');
    },
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'srs',
    get title() {
      return translate('act.srs.title');
    },
    get hint() {
      return translate('act.srs.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
];
