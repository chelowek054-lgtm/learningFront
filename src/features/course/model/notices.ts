// Уведомления на экране курса (T-0083): какие показать и как подписать.
import type { CourseNotification } from '@/shared/api';

/** Только по этой области: уведомление о чужом курсе на экране этого курса не нужно. */
export const noticesFor = (all: CourseNotification[], domain: string): CourseNotification[] =>
  all.filter((n) => n.domain === domain && !n.read);

/** Есть ли в уведомлении пометка о непроверенном: ей отдают тон «предупреждение», а не «успех». */
export const hasDraftNote = (n: Pick<CourseNotification, 'data'>): boolean =>
  (n.data.drafts ?? 0) > 0;

/** Изменившееся пройденное — предупреждение (его стоит повторить), проверка — хорошая новость. */
export const noticeTone = (
  n: Pick<CourseNotification, 'data'> & { kind?: string },
): 'warn' | 'ok' =>
  n.kind === 'concept_changed'
    ? 'warn'
    : n.kind === 'concept_verified'
      ? 'ok'
      : hasDraftNote(n)
        ? 'warn'
        : 'ok';
