// Офлайн-fallback грейдер эссе (WS5-02): мгновенный черновой сигнал без LLM.
import type { LocalGrader } from '@/shared/engine';
import { translate } from '../../../shared/i18n/translate';

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
      {
        get name() {
          return translate('ieltsWritingLocalGrader.1');
        },
        score: Math.min(9, wc / 40),
        max: 9,
        get comment() {
          return translate('ieltsWritingLocalGrader.2', { wc });
        },
      },
      {
        get name() {
          return translate('ieltsWritingLocalGrader.3');
        },
        score: Math.min(9, paragraphs * 2),
        max: 9,
        get comment() {
          return translate('ieltsWritingLocalGrader.4', { paragraphs });
        },
      },
      {
        get name() {
          return translate('ieltsWritingLocalGrader.5');
        },
        score: Math.min(9, awlHits * 1.5),
        max: 9,
        get comment() {
          return translate('ieltsWritingLocalGrader.6', { awlHits });
        },
      },
    ],
    overall,
    errors: [],
    gradedOfflineFallback: true,
  };
};
