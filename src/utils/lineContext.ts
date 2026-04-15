export type LineContextType =
  | 'scripture'
  | 'etymology'
  | 'formula'
  | 'rule'
  | 'drug'
  | 'labvalue'
  | 'mnemonic'
  | 'classification'
  | 'hierarchy'
  | 'case'
  | 'definition'
  | 'comparison'
  | 'date'
  | 'nested'
  | 'key-term'
  | 'plain';

export interface LineContext {
  type: LineContextType;
  label: string;
  confidence: number;
  metadata: Record<string, string | string[] | number>;
}

function getIndentDepth(line: string): number {
  const match = line.match(/^(\s*)/);
  return Math.floor((match?.[1].length ?? 0) / 2);
}

export function classifyLine(rawLine: string, allLines: string[] = [], lineIndex = 0): LineContext {
  const line = rawLine.replace(/::/g, '').trim();

  const scriptureMatch = line.match(/\b(\d?\s?[A-Z][a-zA-Z]+\.?)\s+(\d+):(\d+)(?:[–\-](\d+))?\b/);
  if (scriptureMatch) {
    return {
      type: 'scripture',
      label: 'Scripture',
      confidence: 0.97,
      metadata: {
        book: scriptureMatch[1],
        chapter: scriptureMatch[2],
        verseStart: scriptureMatch[3],
        verseEnd: scriptureMatch[4] ?? scriptureMatch[3],
        full: `${scriptureMatch[1]} ${scriptureMatch[2]}:${scriptureMatch[3]}${scriptureMatch[4] ? `–${scriptureMatch[4]}` : ''}`
      }
    };
  }

  const etymMatch = line.match(/\b(greek|hebrew|latin|aramaic|root)\s+(word|term|for|origin|meaning)?\s*:?\s*["']?([a-zA-Z]+)["']?/i);
  if (etymMatch) {
    const language = etymMatch[1];
    return {
      type: 'etymology',
      label: `${language.charAt(0).toUpperCase()}${language.slice(1)} origin`,
      confidence: 0.9,
      metadata: { language, word: etymMatch[3] }
    };
  }

  const formulaPatterns = [
    /[=]\s*[-−]?[a-zA-Z(]/,
    /[±√∑∫∞]/,
    /[A-Z][a-z]?[\d₀-₉]+/,
    /→\s*[A-Z]/,
    /\b\d+[a-z]²/
  ];
  if (formulaPatterns.some((pattern) => pattern.test(line))) {
    return {
      type: 'formula',
      label: line.includes('→') ? 'Chemical equation' : 'Formula',
      confidence: 0.88,
      metadata: { formula: line }
    };
  }

  const drugSuffixes = /\w+(statin|mab|pril|olol|azole|mycin|cillin|pam|zam|ide|ine|ol)\b/i;
  const drugBrand = /\w+\s*\([A-Z][a-zA-Z]+\)/;
  if (drugSuffixes.test(line) || drugBrand.test(line)) {
    return {
      type: 'drug',
      label: 'Pharmacology',
      confidence: 0.86,
      metadata: { name: line }
    };
  }

  const labMatch = line.match(/(normal|range|value|level|reference)?\s*:?[\s\d,.]+\s*[-–]\s*[\d,.]+\s*([a-zA-Z/μ%]+)?/i);
  const labAbbrev = /\b(Na|K|Cl|BUN|Cr|HgB|Hct|WBC|RBC|Plt|pH|pO2|pCO2|HbA1c|INR|PTT)\b[+\-]?/;
  if ((labMatch && labMatch[1]) || labAbbrev.test(line)) {
    return {
      type: 'labvalue',
      label: 'Lab value',
      confidence: 0.84,
      metadata: { value: line }
    };
  }

  const knownMnemonics = /\b(ADPIE|SBAR|SOAP|PMAT|PEMDAS|HOMES|RACE|PASS|ABCDE|SAMPLE|OPQRST|VINDICATE|MUDPILES|AEIOU-TIPS|RALES|RICE)\b/;
  const genericAcronym = /\b[A-Z]{3,8}\b/;
  if (knownMnemonics.test(line) || genericAcronym.test(line)) {
    const acronym = (line.match(knownMnemonics) || line.match(genericAcronym))?.[0] ?? '';
    return {
      type: 'mnemonic',
      label: 'Mnemonic',
      confidence: 0.8,
      metadata: { acronym }
    };
  }

  const classMatch = line.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|2|3|4|5|6|7|8|9|10)\s+(types?|kinds?|goals?|parts?|elements?|stages?|steps?|phases?|levels?|principles?|pillars?|aspects?)\s+(of|for|in|to)/i);
  if (classMatch) {
    const myDepth = getIndentDepth(allLines[lineIndex] ?? '');
    const childLines = allLines
      .slice(lineIndex + 1)
      .filter((candidate) => candidate.trim())
      .filter((candidate) => getIndentDepth(candidate) > myDepth)
      .map((candidate) => candidate.trim().replace(/^[-*•◦▪■]\s*/, ''))
      .slice(0, 10);

    return {
      type: 'classification',
      label: 'Classification',
      confidence: 0.9,
      metadata: { count: classMatch[1], noun: classMatch[2], items: childLines }
    };
  }

  if (/\b(hierarchy|levels?\s+of|pyramid|taxonomy|ranking|tiers?|strata)\b/i.test(line)) {
    return {
      type: 'hierarchy',
      label: 'Hierarchy',
      confidence: 0.83,
      metadata: { subject: line }
    };
  }

  if (/\bv\.\s+[A-Z]/.test(line) || /\bRe\s+[A-Z]/.test(line) || /\bIn\s+re:?\s+[A-Z]/i.test(line)) {
    return {
      type: 'case',
      label: 'Legal case',
      confidence: 0.93,
      metadata: { citation: line }
    };
  }

  if (/^(if|when|unless|whenever|given\s+that)\b/i.test(line) || /\btherefore\b/i.test(line)) {
    return {
      type: 'rule',
      label: 'Rule',
      confidence: 0.77,
      metadata: { rule: line }
    };
  }

  if (/\s[=:—–]\s/.test(line)) {
    const [term, ...rest] = line.split(/\s[=:—–]\s/);
    return {
      type: 'definition',
      label: 'Definition',
      confidence: 0.88,
      metadata: { term: term.trim(), definition: rest.join(' ').trim() }
    };
  }

  if (/^(before|after|pre-|post-)/i.test(line)) {
    const marker = /^(before|pre-)/i.test(line) ? 'before' : 'after';
    return {
      type: 'comparison',
      label: 'Comparison',
      confidence: 0.84,
      metadata: { marker }
    };
  }

  if (/\b(leads?\s+to|causes?|results?\s+in|because|since|due\s+to)\b/i.test(line)) {
    return {
      type: 'comparison',
      label: 'Cause and effect',
      confidence: 0.78,
      metadata: { marker: 'cause' }
    };
  }

  const dateMatch = line.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  if (dateMatch) {
    return {
      type: 'date',
      label: 'Date',
      confidence: 0.82,
      metadata: { year: dateMatch[1], event: line.replace(dateMatch[0], '').trim() }
    };
  }

  const myDepth = getIndentDepth(allLines[lineIndex] ?? '');
  if (myDepth >= 2) {
    const parentText = [...allLines]
      .slice(0, lineIndex)
      .reverse()
      .find((candidate) => candidate.trim() && getIndentDepth(candidate) < myDepth)
      ?.trim() ?? '';

    return {
      type: 'nested',
      label: 'Nested note',
      confidence: 0.73,
      metadata: { depth: myDepth, parentText }
    };
  }

  const siblings = allLines
    .filter((candidate, index) => index !== lineIndex && Math.abs(index - lineIndex) <= 3 && candidate.trim())
    .map((candidate) => candidate.trim().replace(/^[-*•◦▪■]\s*/, ''))
    .filter(Boolean)
    .slice(0, 5);

  if (siblings.length > 0 && line.split(' ').length <= 5) {
    return {
      type: 'key-term',
      label: 'Key term',
      confidence: 0.65,
      metadata: { term: line, siblings }
    };
  }

  return {
    type: 'plain',
    label: 'Flashcard',
    confidence: 1,
    metadata: {}
  };
}
