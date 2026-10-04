// Публичный API shared/lib.
export { ModuleRegistryProvider, useModuleRegistry } from './module-registry-context';
export { getIsOnline, useIsOnline } from './connectivity';
export { newId } from './id';
export {
  gradeQuestions,
  isCorrect,
  parseQuestions,
  type QuestionResult,
  type QuestionType,
  type QuizQuestion,
  type QuizResult,
} from './quiz';
