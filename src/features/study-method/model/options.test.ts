import { describe, expect, it } from 'vitest';
import type { StudyMethodChoice } from '@/shared/api';
import { activeMethod, canChoose, optionsFor } from './options';

const opt = (id: string, purpose: string, inCourse = true) => ({
  id,
  title: id,
  purpose,
  activityType: id,
  offline: true,
  module: id,
  inCourse,
});

const choice = (preferred: Record<string, string> = {}): StudyMethodChoice => ({
  preferred,
  options: [
    opt('srs', 'remember'),
    opt('first_letters', 'remember'),
    opt('writing', 'apply', false),
    opt('concept_study', 'read'),
  ],
});

describe('выбор способа', () => {
  it('предлагает только способы шага, входящие в курс', () => {
    expect(optionsFor(choice(), 'remember').map((o) => o.id)).toEqual(['srs', 'first_letters']);
    expect(optionsFor(choice(), 'apply')).toEqual([]);
  });

  it('без выбора действует первый способ, как решает сервер', () => {
    expect(activeMethod(choice(), 'remember')).toBe('srs');
  });

  it('учитывает выбор человека', () => {
    expect(activeMethod(choice({ remember: 'first_letters' }), 'remember')).toBe('first_letters');
  });

  it('выбор отключённого модуля игнорируется — действует способ по умолчанию', () => {
    expect(activeMethod(choice({ remember: 'gone' }), 'remember')).toBe('srs');
  });

  it('выбирать можно, только когда есть из чего', () => {
    expect(canChoose(choice(), 'remember')).toBe(true);
    expect(canChoose(choice(), 'read')).toBe(false);
  });
});
