// Метаданные модуля «Модель знаний». ЧИСТЫЕ данные — без рендереров/RN.
// concept_recall и srs НЕ здесь: они уже объявлены модулем ml и переиспользуются
// (05-knowledge-model §9), а реестр запрещает коллизии типов.
import type { ActivityTypeDef } from '@/shared/engine';

export const KNOWLEDGE_MODULE_ID = 'knowledge';
export const KNOWLEDGE_MODULE_TITLE = 'Модель знаний';

export const knowledgeActivityTypes: ActivityTypeDef[] = [
  { type: 'concept_study', connectivity: 'offline', payloadSchema: {} },
  { type: 'concept_contrast', connectivity: 'online', payloadSchema: {}, producesErrorLog: true },
  { type: 'concept_apply', connectivity: 'online', payloadSchema: {}, producesErrorLog: true },
];
