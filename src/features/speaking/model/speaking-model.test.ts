import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_SEC, formatSec, parseSpeakingTask, sendBlocker } from './speaking-model';

describe('speaking-model', () => {
  it('разбирает задание и подставляет лимит по умолчанию', () => {
    expect(parseSpeakingTask({ prompt: 'Describe your town.' })).toEqual({
      prompt: 'Describe your town.',
      maxSec: DEFAULT_MAX_SEC,
    });
    expect(parseSpeakingTask({ prompt: 'x', maxSec: 60 })?.maxSec).toBe(60);
    expect(parseSpeakingTask({ prompt: '  ' })).toBeNull();
    expect(parseSpeakingTask(null)).toBeNull();
  });

  it('не даёт отправить слишком короткую запись', () => {
    expect(sendBlocker(1)).toContain('короткая');
    expect(sendBlocker(10)).toBeNull();
  });

  it('форматирует время записи', () => {
    expect(formatSec(75)).toBe('01:15');
  });
});
