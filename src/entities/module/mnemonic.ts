// Метаданные модуля «Вспомнить по первым буквам» (T-0063): вторая техника запоминания.
// ЧИСТЫЕ данные — без рендереров/RN.
import type { ActivityTypeDef } from '@/shared/engine';
import { translate } from '../../shared/i18n/translate';

export const MNEMONIC_MODULE_ID = 'mnemonic';
export const MNEMONIC_MODULE_TITLE = 'Вспомнить по первым буквам';

export const mnemonicActivityTypes: ActivityTypeDef[] = [
  {
    type: 'concept_mnemonic',
    get title() {
      return translate('act.concept_mnemonic.title');
    },
    get hint() {
      return translate('act.concept_mnemonic.hint');
    },
    connectivity: 'offline',
    payloadSchema: {},
  },
];
