// Куда вести человека по нажатию на уведомление (T-0111): по виду уведомления, а не всегда на «Сегодня».
export type NotificationTarget = '/' | '/path' | '/review';

export function targetForNotification(data: unknown): NotificationTarget {
  const kind = String((data as { kind?: unknown } | null)?.kind ?? '');
  if (kind.startsWith('course') || kind.startsWith('concept')) return '/path';
  if (kind === 'review' || kind === 'srs_due') return '/review';
  return '/';
}
