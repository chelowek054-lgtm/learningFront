import { describe, expect, it } from 'vitest';
import type { CourseNotification } from '@/shared/api';
import { hasDraftNote, noticesFor, noticeTone } from './notices';

const n = (over: Partial<CourseNotification> = {}): CourseNotification => ({
  id: 'n1',
  kind: 'course_extended',
  domain: 'algebra',
  title: 'Курс дополнен',
  body: '…',
  data: { added: 2, drafts: 2 },
  createdAt: null,
  read: false,
  ...over,
});

describe('уведомления на экране курса', () => {
  it('показываются только непрочитанные по этой области', () => {
    const all = [n(), n({ id: 'n2', domain: 'french' }), n({ id: 'n3', read: true })];
    expect(noticesFor(all, 'algebra').map((x) => x.id)).toEqual(['n1']);
    expect(noticesFor([], 'algebra')).toEqual([]);
  });

  it('правка пройденного предупреждает, проверка — хорошая новость', () => {
    expect(noticeTone(n({ kind: 'concept_changed', data: { concepts: [] } }))).toBe('warn');
    expect(noticeTone(n({ kind: 'concept_verified', data: { drafts: 3 } }))).toBe('ok');
  });

  it('уведомление с черновиками предупреждает, без них — сообщает об успехе', () => {
    expect(hasDraftNote(n())).toBe(true);
    expect(noticeTone(n())).toBe('warn');
    expect(noticeTone(n({ data: { steps: 4, drafts: 0 } }))).toBe('ok');
    expect(noticeTone(n({ data: {} }))).toBe('ok');
  });
});
