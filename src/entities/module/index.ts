// Публичный API entities/module.
export { LANGUAGES_MODULE_ID, LANGUAGES_MODULE_TITLE, languagesActivityTypes } from './languages';
export { ML_MODULE_ID, ML_MODULE_TITLE, mlActivityTypes } from './ml';
export {
  languagesModule,
  mlModule,
  moduleManifests,
  initModuleRegistry,
  getModuleRegistry,
} from './registry';
