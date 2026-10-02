import { describe, expect, it } from 'vitest';
import { barRows, countWords, parseTaskData, wordsShort } from './task-data';

const RAW = {
  kind: 'bar',
  title: 'Internet access (%)',
  unit: '%',
  categories: ['2010', '2015'],
  series: [
    { name: 'A', values: [50, 100] },
    { name: 'B', values: [25, 75] },
  ],
};

describe('parseTaskData', () => {
  it('принимает данные задания и сохраняет форму', () => {
    const d = parseTaskData(RAW)!;
    expect(d.categories).toEqual(['2010', '2015']);
    expect(d.series.map((s) => s.name)).toEqual(['A', 'B']);
    expect(d.unit).toBe('%');
  });

  it('мусор и пустые данные — не данные, а не падение', () => {
    expect(parseTaskData(null)).toBeNull();
    expect(parseTaskData('x')).toBeNull();
    expect(parseTaskData({ categories: [], series: [] })).toBeNull();
    expect(parseTaskData({ categories: ['a'] })).toBeNull();
  });

  it('нечисловые значения становятся нулём, битые ряды отбрасываются', () => {
    const d = parseTaskData({
      categories: ['a'],
      series: [{ name: 'ok', values: ['x' as unknown as number] }, { values: [1] }, null],
    } as never)!;
    expect(d.series).toEqual([{ name: 'ok', values: [0] }]);
  });
});

describe('barRows', () => {
  it('длина полосы — доля от наибольшего значения по всем рядам', () => {
    const rows = barRows(parseTaskData(RAW)!);
    expect(rows.map((r) => r.category)).toEqual(['2010', '2015']);
    expect(rows[1].bars.map((b) => b.fraction)).toEqual([1, 0.75]);
    expect(rows[0].bars.map((b) => b.fraction)).toEqual([0.5, 0.25]);
  });

  it('все нули не дают деления на ноль', () => {
    const rows = barRows(
      parseTaskData({ categories: ['a'], series: [{ name: 's', values: [0] }] })!,
    );
    expect(rows[0].bars[0].fraction).toBe(0);
  });

  it('короткий ряд дополняется нулём', () => {
    const rows = barRows(
      parseTaskData({ categories: ['a', 'b'], series: [{ name: 's', values: [4] }] })!,
    );
    expect(rows[1].bars[0].value).toBe(0);
  });
});

describe('слова', () => {
  it('считает по пробельным разделителям, в том числе переносам строк', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  one  two\nthree ')).toBe(3);
  });

  it('сколько не хватает до минимума в 150 слов', () => {
    const text = Array.from({ length: 140 }, () => 'w').join(' ');
    expect(wordsShort(text, 150)).toBe(10);
    expect(wordsShort(text + ' ' + 'w '.repeat(10), 150)).toBe(0);
  });

  it('без минимума в задании норма не требуется', () => {
    expect(wordsShort('one', undefined)).toBe(0);
    expect(wordsShort('one', 0)).toBe(0);
  });
});
