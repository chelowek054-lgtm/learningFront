// Тест ЧИСТЫХ метаданных модулей — импортирует только данные (без RN/рендереров),
// исполняется в node. Логику реестра покрывает shared/engine/module/registry.test.ts.
import { describe, expect, it } from 'vitest';
import { LANGUAGES_MODULE_ID, languagesActivityTypes } from './languages';
import { ML_MODULE_ID, mlActivityTypes } from './ml';

describe('Метаданные модулей', () => {
  it('languages объявляет ожидаемые типы Activity', () => {
    const types = languagesActivityTypes.map((t) => t.type);
    expect(types).toContain('ielts_writing_task2');
    expect(types).toContain('vocab_srs');
  });

  it('ml объявляет ожидаемые типы Activity', () => {
    const types = mlActivityTypes.map((t) => t.type);
    expect(types).toContain('concept_recall');
    expect(types).toContain('code_task');
  });

  it('нет коллизий типов между модулями', () => {
    const all = [...languagesActivityTypes, ...mlActivityTypes].map((t) => t.type);
    expect(new Set(all).size).toBe(all.length);
  });

  it('online-типы имеют корректный connectivity', () => {
    const writing = languagesActivityTypes.find((t) => t.type === 'ielts_writing_task2');
    expect(writing?.connectivity).toBe('online');
    expect(writing?.producesErrorLog).toBe(true);
  });

  it('id модулей различны', () => {
    expect(LANGUAGES_MODULE_ID).not.toBe(ML_MODULE_ID);
  });
});
