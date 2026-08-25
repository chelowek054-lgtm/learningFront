// Публичный API entities/module — ТОЛЬКО метаданные (без рендереров/сборки).
// Сборка реестра с рендерерами — в widgets/module-registry (импорт вниз запрещён).
export { LANGUAGES_MODULE_ID, LANGUAGES_MODULE_TITLE, languagesActivityTypes } from './languages';
export { ML_MODULE_ID, ML_MODULE_TITLE, mlActivityTypes } from './ml';
export { KNOWLEDGE_MODULE_ID, KNOWLEDGE_MODULE_TITLE, knowledgeActivityTypes } from './knowledge';
