// Метаданные модуля «Вспомнить по первым буквам» (T-0063): вторая техника запоминания.
// ЧИСТЫЕ данные — без рендереров/RN.
import type { ActivityTypeDef } from '@/shared/engine';

export const MNEMONIC_MODULE_ID = 'mnemonic';
export const MNEMONIC_MODULE_TITLE = 'Вспомнить по первым буквам';

export const mnemonicActivityTypes: ActivityTypeDef[] = [
  {
    type: 'concept_mnemonic',
    title: 'Вспомнить по первым буквам',
    hint: 'Восстановить формулировку по подсказке и оценить себя',
    connectivity: 'offline',
    payloadSchema: {},
  },
];
