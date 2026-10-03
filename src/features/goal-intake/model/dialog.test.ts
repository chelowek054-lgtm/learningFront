import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  canAsk,
  canConfirm,
  collectAnswers,
  editSummary,
  needsChoice,
  recapLine,
  volumeLine,
  subjectOf,
} from './dialog';

const questions = [
  { id: 'q1', text: 'Для чего?' },
  { id: 'q2', text: 'С какого уровня?' },
  { id: 'q3', text: 'Какие подтемы?' },
];

describe('диалог постановки цели', () => {
  it('пустое поле — пропуск, а не пустой ответ', () => {
    const answers = collectAnswers(questions, { q1: ' для работы ', q2: '   ' });

    expect(answers).toEqual([
      { question: 'Для чего?', answer: 'для работы' },
      { question: 'С какого уровня?', answer: null },
      { question: 'Какие подтемы?', answer: null },
    ]);
    expect(answeredCount(answers)).toBe(1);
  });

  it('можно пропустить всё и всё равно получить пересказ', () => {
    expect(answeredCount(collectAnswers(questions, {}))).toBe(0);
  });

  it('вопросы задаются, только когда есть что уточнять', () => {
    expect(canAsk(' ')).toBe(false);
    expect(canAsk('м')).toBe(false);
    expect(canAsk('машинное обучение')).toBe(true);
  });

  it('подтвердить нельзя без названной области', () => {
    expect(canConfirm({ area: ' ', goal: 'x', level: 'apply', wishes: [] })).toBe(false);
    expect(canConfirm({ area: 'ML', goal: '', level: 'apply', wishes: [] })).toBe(true);
  });

  it('правка пересказа чистит пожелания и подставляет область вместо пустой цели', () => {
    const s = editSummary(
      { area: 'ML', goal: 'работа', level: 'apply', wishes: ['сети'] },
      { goal: ' ', area: ' ML глубже ', wishes: ['сети', '  ', ' деревья '] },
    );

    expect(s).toEqual({
      area: 'ML глубже',
      goal: 'ML глубже',
      level: 'apply',
      wishes: ['сети', 'деревья'],
    });
  });

  it('пересказ называет область и цель, не повторяя одно и то же', () => {
    expect(recapLine({ area: 'ML', goal: 'работа', level: 'apply', wishes: [] })).toBe(
      'область «ML», цель — работа',
    );
    expect(recapLine({ area: 'ML', goal: 'ML', level: 'apply', wishes: [] })).toBe('область «ML»');
  });

  it('предмет профиля берёт название и уровень из подтверждённого пересказа', () => {
    const subject = subjectOf(
      { area: 'Машинное обучение', goal: 'работа', level: 'create', wishes: [] },
      (t) => t.toLowerCase().replace(/\s+/g, '-'),
    );

    expect(subject).toEqual({
      id: 'машинное-обучение',
      title: 'Машинное обучение',
      target: 'create',
    });
  });

  it('выбор предлагается, только если есть базовые области и варианты различаются', () => {
    const v = { bloom: 'apply', precise: true, domainCount: 2, conceptCount: 9, unbuilt: [] };
    const base = {
      goal: 'ml',
      registered: true,
      variants: { full: v, intuitive: { ...v, conceptCount: 3 } },
    };

    expect(needsChoice({ ...base, differs: true })).toBe(true);
    expect(needsChoice({ ...base, differs: false })).toBe(false);
    expect(needsChoice({ goal: 'ml', registered: false, variants: {} })).toBe(false);
    expect(needsChoice(null)).toBe(false);
  });

  it('объём называется с правильным склонением и пометкой оценки', () => {
    const exact = { bloom: 'apply', precise: true, domainCount: 5, conceptCount: 61, unbuilt: [] };

    expect(volumeLine(exact)).toBe('5 областей, 61 понятие');
    expect(volumeLine({ ...exact, precise: false, domainCount: 2, conceptCount: 23 })).toBe(
      '2 области, около 23 понятия',
    );
    expect(volumeLine({ ...exact, domainCount: 11, conceptCount: 12 })).toBe(
      '11 областей, 12 понятий',
    );
  });
});
