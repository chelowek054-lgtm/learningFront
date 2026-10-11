import { describe, expect, it } from 'vitest';
import { targetForNotification } from './notification-route';

describe('куда ведёт уведомление', () => {
  it('курс и понятие — во вкладку «Путь», повторение — на повторение, остальное — на «Сегодня»', () => {
    expect(targetForNotification({ kind: 'course_ready' })).toBe('/path');
    expect(targetForNotification({ kind: 'concept_verified' })).toBe('/path');
    expect(targetForNotification({ kind: 'review' })).toBe('/review');
    expect(targetForNotification({})).toBe('/');
    expect(targetForNotification(null)).toBe('/');
  });
});
