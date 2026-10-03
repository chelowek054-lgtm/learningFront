// Публичный API shared/api.
export { SqliteLocalStore, createSqliteLocalStore } from './db/sqlite-local-store';
export { api, ApiError, NetworkError } from './http';
export { getToken, setToken, clearToken } from './token';
export { getThemeMode, setThemeMode, type ThemeMode } from './preferences';
export {
  register,
  login,
  logout,
  fetchMe,
  updateProfile,
  requestPasswordReset,
  confirmPasswordReset,
  type AuthUser,
} from './auth-api';
export { createSyncClient } from './sync-client';
export {
  clarifyGoal,
  confirmGoal,
  getGoalIntake,
  getGoalVolume,
  type GoalVolume,
  type VolumeVariant,
  summarizeGoal,
  type GoalAnswer,
  type GoalIntakeState,
  type GoalQuestion,
  type GoalSummary,
} from './goal-intake-api';
export { flushEvidence, postEvidence, submitEvidence, type Evidence } from './evidence-api';
export {
  getStudyMethods,
  setStudyMethod,
  type StudyMethodChoice,
  type StudyMethodOption,
} from './methods-api';
export { createJobQueue } from './job-queue';
export { getLocalStore } from './local-store';
export { syncNow } from './sync-service';
export { ClientOutdatedError, onClientOutdated } from './client-outdated';
export { APP_VERSION } from './app-version';
export { installErrorReporter } from './error-reporter';
export { createAutoSync, startAutoSync } from './auto-sync';
export { submitForGrading, type SubmitParams } from './grading';
export {
  nextProbe,
  answerProbe,
  masteryMap,
  type Probe,
  type ProbeItem,
  type ProbeResult,
  type StopCode,
  buildCourse,
  getCourse,
  completeStep,
  type Course,
  type CourseStep,
  type CourseActivity,
  type StepReason,
  startStep,
  answerStep,
  weakNodes,
  type StepActivity,
  type StepResult,
  type AnswerResult,
  type MasteryMap,
  type MasteryNode,
  getGraph,
  splitGoal,
  buildGoal,
  type GoalSplit,
  proposeFromMaterial,
  acceptFromMaterial,
  questionsFromMaterial,
  type MaterialNodeProposal,
  type MaterialProposal,
  getNode,
  buildCanon,
  recomputeCentrality,
  approveNode,
  overrideNode,
  patchUserNode,
  expandNode,
  type Graph,
  type GraphNode,
  type GraphEdge,
  type CentralityRow,
  type NodeTier,
} from './graph-api';
export {
  cacheMaterial,
  cacheMaterialList,
  cachedMaterial,
  cachedMaterialList,
  deleteMaterial,
  dropCachedMaterial,
  getMaterial,
  listMaterials,
  loadMaterial,
  loadMaterialList,
  uploadErrorMessage,
  uploadMaterial,
  MAX_UPLOAD_BYTES,
  type MaterialFragment,
  type MaterialFull,
  type MaterialSummary,
  type PickedFile,
} from './materials-api';
