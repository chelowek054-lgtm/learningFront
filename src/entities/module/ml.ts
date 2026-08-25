// Метаданные модуля «Программирование/ML». ЧИСТЫЕ данные — без рендереров/RN.
// Типы Activity из docs/architecture/03-functional.md §2.1.
import type { ActivityTypeDef } from '@/shared/engine';

export const ML_MODULE_ID = 'ml';
export const ML_MODULE_TITLE = 'Программирование / ML';

// title/hint описывают задачу человека, а не механизм: «Вспомнить», а не
// «concept_recall». Это единственное место, где живёт название типа.
export const mlActivityTypes: ActivityTypeDef[] = [
  {
    type: 'material_read',
    title: 'Чтение материала',
    hint: 'Разобрать текст и отметить непонятное',
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'concept_recall',
    title: 'Вспомнить',
    hint: 'Ответить своими словами, не подглядывая',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'concept_srs',
    title: 'Повторение понятий',
    hint: 'Короткие карточки по интервалам',
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'code_task',
    title: 'Задача на код',
    hint: 'Написать решение и получить разбор',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
];
