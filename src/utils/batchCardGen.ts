function getIndentDepth(line: string): number {
  const match = line.match(/^(\s*)/);
  return Math.floor((match?.[1].length ?? 0) / 2);
}

function cleanBullet(line: string): string {
  return line.trim().replace(/^[-*•◦▪■]\s*/, '');
}

export function extractBatchCards(allLines: string[], anchorLineIndex: number): Array<{ front: string; back: string }> {
  const anchorLine = allLines[anchorLineIndex] ?? '';
  const anchorDepth = getIndentDepth(anchorLine);
  const anchorText = cleanBullet(anchorLine);
  const cards: Array<{ front: string; back: string }> = [];

  for (let index = anchorLineIndex + 1; index < allLines.length; index += 1) {
    const line = allLines[index] ?? '';
    if (!line.trim()) {
      continue;
    }

    const depth = getIndentDepth(line);
    if (depth <= anchorDepth) {
      break;
    }

    if (depth !== anchorDepth + 1) {
      continue;
    }

    const clean = cleanBullet(line);
    if (clean.includes('::')) {
      const [front, back] = clean.split('::').map((part) => part.trim());
      cards.push({ front, back });
      continue;
    }

    if (/\s[=:—–]\s/.test(clean)) {
      const [term, ...rest] = clean.split(/\s[=:—–]\s/);
      cards.push({ front: `What is ${term.trim()}?`, back: rest.join(' ').trim() });
      continue;
    }

    cards.push({
      front: `Under ${anchorText}, what is "${clean}"?`,
      back: ''
    });
  }

  return cards;
}
