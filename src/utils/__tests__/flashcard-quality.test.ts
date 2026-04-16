import { describe, expect, it } from 'vitest';
import { classifyLine } from '../lineContext';
import { buildActions } from '../paletteActions';
import { extractBatchCards } from '../batchCardGen';

type ScoreInput = {
  front: string;
  back: string;
};

function scoreCard(card: ScoreInput): number {
  let score = 0;
  const front = card.front.trim();
  const back = card.back.trim();

  if (front.length >= 8 && front.length <= 140) score += 1;
  if (back.length >= 8) score += 1;
  if (!/\[[^\]]+\]/.test(front) && !/\[[^\]]+\]/.test(back)) score += 1;
  if (/\?|^(what|how|when|where|why|state|name|which)\b/i.test(front)) score += 1;

  return score;
}

function bestGeneratedCard(rawLine: string, allLines: string[], lineIndex: number) {
  const context = classifyLine(rawLine, allLines, lineIndex);
  const actions = buildActions(context, rawLine, allLines, lineIndex);
  const flash = actions.find((action) => action.type === 'flashcard');

  const front = (flash?.front ?? rawLine).trim();
  const back = (flash?.back ?? rawLine).trim() || rawLine.trim();
  return { front, back, contextType: context.type };
}

describe('flashcard quality baseline', () => {
  it('generates strong cards across representative domains', () => {
    const cases = [
      {
        lines: ['Romans 12:2 transformed by renewal of mind'],
        index: 0,
      },
      {
        lines: ['Metoprolol'],
        index: 0,
      },
      {
        lines: ['1945 end of World War II in Europe'],
        index: 0,
      },
      {
        lines: ['One three goals of apologetics', '  clarify worldview', '  remove objections', '  proclaim Christ'],
        index: 0,
      },
      {
        lines: ['Velocity is distance over time'],
        index: 0,
      },
    ];

    const scores = cases.map(({ lines, index }) => {
      const card = bestGeneratedCard(lines[index], lines, index);
      return scoreCard(card);
    });

    const average = scores.reduce((sum, value) => sum + value, 0) / scores.length;
    expect(average).toBeGreaterThanOrEqual(3);
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(2);
  });

  it('creates coherent batch cards from nested outlines', () => {
    const lines = [
      'Stages of cellular respiration',
      '  Glycolysis',
      '  Krebs cycle',
      '  Electron transport chain',
      'Next section',
    ];

    const cards = extractBatchCards(lines, 0);
    expect(cards.length).toBe(3);
    for (const card of cards) {
      expect(card.front.length).toBeGreaterThan(10);
      expect(/\[[^\]]+\]/.test(card.front)).toBe(false);
      expect(/\[[^\]]+\]/.test(card.back)).toBe(false);
    }
  });
});
