// Метаданные модуля «Языки» (TOEFL/IELTS). ЧИСТЫЕ данные — без рендереров/RN.
// Типы Activity из docs/architecture/03-functional.md §1.1.
import type { ActivityTypeDef } from '@/shared/engine';

export const LANGUAGES_MODULE_ID = 'languages';
export const LANGUAGES_MODULE_TITLE = 'Языки';

export const languagesActivityTypes: ActivityTypeDef[] = [
  {
    type: 'ielts_writing_task2',
    title: 'Эссе IELTS (Task 2)',
    hint: 'Написать эссе и получить оценку по критериям',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'ielts_writing_task1',
    title: 'Описание данных IELTS (Task 1)',
    hint: 'Описать график или таблицу',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'reading_drill',
    title: 'Чтение',
    hint: 'Текст с вопросами на понимание',
    connectivity: 'offline',
    payloadSchema: {},
  },
  {
    type: 'listening_drill',
    title: 'Аудирование',
    hint: 'Прослушать и ответить на вопросы',
    connectivity: 'offline',
    payloadSchema: {},
  },
  // Speaking — Фаза 2 (STT), тип объявлен заранее.
  {
    type: 'speaking_response',
    title: 'Устный ответ',
    hint: 'Записать ответ голосом',
    connectivity: 'online',
    payloadSchema: {},
    producesErrorLog: true,
  },
  {
    type: 'vocab_srs',
    title: 'Повторение слов',
    hint: 'Карточки лексики по интервалам',
    connectivity: 'offline',
    payloadSchema: {},
  },
];
