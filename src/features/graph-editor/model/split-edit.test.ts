import { describe, expect, it } from 'vitest';
import {
  budgetFor,
  canBuild,
  orderByPrereqs,
  removeSubdomain,
  renameSubdomain,
  toPayload,
  type Subdomain,
} from './split-edit';

const s = (key: string, title: string, prereqs: string[] = []): Subdomain => ({
  key,
  title,
  summary: '',
  prereqs,
});

const LIST = [s('a', 'Основы'), s('b', 'Ядро', ['a']), s('c', 'Практика', ['b', 'a'])];

describe('правка разбиения', () => {
  it('убранный субдомен исчезает и из предпосылок остальных', () => {
    const out = removeSubdomain(LIST, 'a');
    expect(out.map((x) => x.key)).toEqual(['b', 'c']);
    expect(out[0].prereqs).toEqual([]);
    expect(out[1].prereqs).toEqual(['b']);
  });

  it('переименование меняет только название', () => {
    const out = renameSubdomain(LIST, 'b', 'Главное');
    expect(out[1]).toMatchObject({ key: 'b', title: 'Главное', prereqs: ['a'] });
    expect(out[0].title).toBe('Основы');
  });

  it('исходный список не мутируется', () => {
    removeSubdomain(LIST, 'a');
    expect(LIST).toHaveLength(3);
  });
});

describe('что уходит на сервер', () => {
  it('пустые названия отсекаются вместе со ссылками на них, остальные обрезаются', () => {
    const out = toPayload([s('a', '  Основы '), s('b', '   ', []), s('c', 'Ядро', ['a', 'b'])]);
    expect(out.map((x) => x.title)).toEqual(['Основы', 'Ядро']);
    expect(out[1].prereqs).toEqual(['a']);
  });

  it('строить можно, пока есть хоть один названный субдомен', () => {
    expect(canBuild(LIST)).toBe(true);
    expect(canBuild([s('a', '  ')])).toBe(false);
    expect(canBuild([])).toBe(false);
  });

  it('бюджет — по числу оставшихся субдоменов', () => {
    expect(budgetFor(LIST, 8)).toEqual({ requests: 3, subdomains: 3, limit: 8 });
    expect(budgetFor(removeSubdomain(LIST, 'c'), 8).requests).toBe(2);
    expect(budgetFor([s('a', '')], 8).requests).toBe(0);
  });
});

describe('порядок показа', () => {
  it('предпосылки раньше зависимых', () => {
    const out = orderByPrereqs([LIST[2], LIST[1], LIST[0]]);
    expect(out.map((x) => x.key)).toEqual(['a', 'b', 'c']);
  });

  it('цикл не вешает экран: остаток выводится как есть', () => {
    const cyc = [s('x', 'X', ['y']), s('y', 'Y', ['x'])];
    expect(
      orderByPrereqs(cyc)
        .map((x) => x.key)
        .sort(),
    ).toEqual(['x', 'y']);
  });

  it('предпосылка на несуществующий субдомен не блокирует', () => {
    expect(orderByPrereqs([s('a', 'A', ['ghost'])]).map((x) => x.key)).toEqual(['a']);
  });
});
