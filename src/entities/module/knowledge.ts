// Метаданные модуля «Модель знаний». ЧИСТЫЕ данные — без рендереров/RN.
// concept_recall НЕ здесь: он объявлен модулем ml и переиспользуется
// (05-knowledge-model §9), а реестр запрещает коллизии типов.
//
// А вот `srs` объявлен здесь, хотя прежний комментарий уверял, что его даёт ml.
// Это была неправда: ml объявляет `concept_srs`, а шаг курса возвращает `srs`
// (modules/knowledge/course.py). Тип, который backend отдаёт, но никто не
// объявлял, оставался без названия и рендерера.
import type { ActivityTypeDef } from '@/shared/engine';

export const KNOWLEDGE_MODULE_ID = 'knowledge';
export const KNOWLEDGE_MODULE_TITLE = 'Модель знаний';

export const knowledgeActivityTypes: ActivityTypeDef[] = [
  {
    type: 'concept_study',
    title: 'Теория',
    hint: 'Разобрать понятие с примерами',
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'concept_contrast',
    title: 'Отличить от заблуждения',
    hint: 'Выбрать верное там, где легко перепутать',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'concept_apply',
    title: 'Применить',
    hint: 'Решить задачу на это понятие',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'srs',
    title: 'Повторение',
    hint: 'Карточка на удержание понятия',
    connectivity: 'offline',
    payloadSchema: {},
  },
];
