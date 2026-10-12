// Listening-дрилл (T-0037, R-0022): разбор payload, лимит прослушиваний, состояние кэша аудио.
// Всё чистое. Проверка ответов — та же, что у чтения: вопросы и их формат общие.
import { parseQuestions, type QuizQuestion } from '../../../shared/engine';
import { translate } from '../../../shared/i18n/translate';

/** Сколько раз можно слушать, если задание не сказало иначе (как на экзамене — один раз). */
export const DEFAULT_MAX_PLAYS = 1;

export interface ListeningDrill {
  title: string;
  /** Путь к аудио на сервере, относительно префикса API. */
  audioPath: string;
  maxPlays: number;
  questions: QuizQuestion[];
}

export function parseListeningDrill(raw: unknown): ListeningDrill | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.audioPath !== 'string' || !p.audioPath || !Array.isArray(p.questions)) return null;
  const questions = parseQuestions(p.questions);
  if (questions.length === 0) return null;
  const max = typeof p.maxPlays === 'number' ? Math.floor(p.maxPlays) : DEFAULT_MAX_PLAYS;
  return {
    title: typeof p.title === 'string' ? p.title : '',
    audioPath: p.audioPath,
    maxPlays: max >= 1 ? max : DEFAULT_MAX_PLAYS,
    questions,
  };
}

export const playsLeft = (maxPlays: number, used: number): number => Math.max(0, maxPlays - used);

export type AudioState = 'cached' | 'missing' | 'checking';

/** Что показать вместо кнопки «Слушать»; null — слушать можно. */
export function listenBlocker(state: AudioState, maxPlays: number, used: number): string | null {
  if (state === 'checking') return translate('listeningDrillListeningModel.1');
  if (state === 'missing') return translate('listeningDrillListeningModel.2');
  if (playsLeft(maxPlays, used) === 0) return translate('listeningDrillListeningModel.3');
  return null;
}
