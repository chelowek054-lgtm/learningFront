// Офлайн-fallback грейдер эссе (WS5-02): мгновенный черновой сигнал без LLM.
import type { LocalGrader } from '@/shared/engine';

const AWL = [
  'analyse',
  'approach',
  'concept',
  'consistent',
  'significant',
  'establish',
  'interpret',
  'derive',
  'hypothesis',
  'subsequent',
];

export const ieltsWritingLocalGrader: LocalGrader = (answer) => {
  const text = String(answer ?? '');
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim()).length;
  const awlHits = new Set(
    words.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')).filter((w) => AWL.includes(w)),
  ).size;

  const overall = wc < 150 ? 5 : wc < 250 ? 6 : 6.5;
  return {
    criteria: [
      { name: 'Объём', score: Math.min(9, wc / 40), max: 9, comment: `${wc} слов (цель ≥250)` },
      {
        name: 'Структура',
        score: Math.min(9, paragraphs * 2),
        max: 9,
        comment: `${paragraphs} абз.`,
      },
      {
        name: 'Лексика (AWL)',
        score: Math.min(9, awlHits * 1.5),
        max: 9,
        comment: `${awlHits} academic-слов`,
      },
    ],
    overall,
    errors: [],
    gradedOfflineFallback: true,
  };
};
