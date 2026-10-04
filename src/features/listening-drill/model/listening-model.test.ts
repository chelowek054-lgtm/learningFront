import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_PLAYS,
  listenBlocker,
  parseListeningDrill,
  playsLeft,
} from './listening-model';

const q = { id: 'q1', type: 'mcq', prompt: 'Why?', options: ['a', 'b'], answer: 'a' };
const payload = { title: 'Commute', audioPath: '/languages/listening/1/audio', questions: [q] };

describe('listening-model', () => {
  it('по умолчанию слушать можно один раз', () => {
    expect(parseListeningDrill(payload)?.maxPlays).toBe(DEFAULT_MAX_PLAYS);
    expect(parseListeningDrill({ ...payload, maxPlays: 3 })?.maxPlays).toBe(3);
    expect(parseListeningDrill({ ...payload, maxPlays: 0 })?.maxPlays).toBe(DEFAULT_MAX_PLAYS);
  });

  it('повреждённое задание не разбирается', () => {
    expect(parseListeningDrill(null)).toBeNull();
    expect(parseListeningDrill({ ...payload, audioPath: '' })).toBeNull();
    expect(parseListeningDrill({ ...payload, questions: [] })).toBeNull();
  });

  it('считает оставшиеся прослушивания, не уходя ниже нуля', () => {
    expect(playsLeft(2, 1)).toBe(1);
    expect(playsLeft(1, 3)).toBe(0);
  });

  it('объясняет, почему слушать нельзя', () => {
    expect(listenBlocker('cached', 1, 0)).toBeNull();
    expect(listenBlocker('missing', 1, 0)).toContain('при подключении к сети');
    expect(listenBlocker('cached', 1, 1)).toContain('не осталось');
    expect(listenBlocker('checking', 1, 0)).toContain('Проверяю');
  });
});
