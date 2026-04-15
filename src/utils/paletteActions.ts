import { extractBatchCards } from './batchCardGen';
import { LineContext } from './lineContext';

export interface PaletteAction {
  id: string;
  isPrimary?: boolean;
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  type: 'flashcard' | 'batch' | 'format';
  front?: string;
  back?: string;
  cards?: Array<{ front: string; back: string }>;
  snippet?: string;
}

function cleanLine(rawLine: string): string {
  return rawLine.replace(/::/g, '').replace(/:\s*$/, '').trim();
}

export function buildActions(
  context: LineContext,
  rawLine: string,
  allLines: string[] = [],
  lineIndex = 0
): PaletteAction[] {
  const line = cleanLine(rawLine);

  switch (context.type) {
    case 'scripture': {
      const ref = String(context.metadata.full ?? line);
      return [
        {
          id: 'scripture-topic',
          isPrimary: true,
          icon: '✝',
          iconBg: 'rgba(167, 139, 250, 0.16)',
          title: 'Verse to topic card',
          subtitle: 'Ask what the passage addresses',
          type: 'flashcard',
          front: `What topic does ${ref} address?`,
          back: '[describe the topic from your notes]'
        },
        {
          id: 'scripture-recall',
          icon: '✝',
          iconBg: 'rgba(167, 139, 250, 0.16)',
          title: 'Reference recall card',
          subtitle: 'Ask where the passage is found',
          type: 'flashcard',
          front: 'Where is the main passage about [topic]?',
          back: ref
        },
        {
          id: 'scripture-batch',
          icon: '⬡',
          iconBg: 'rgba(96, 165, 250, 0.12)',
          title: 'Batch cards from sub-themes',
          subtitle: 'Create one card per indented sub-theme',
          type: 'batch',
          cards: extractBatchCards(allLines, lineIndex)
        }
      ];
    }

    case 'etymology': {
      const language = String(context.metadata.language ?? 'original');
      const word = String(context.metadata.word ?? line);
      return [
        {
          id: 'etymology-meaning',
          isPrimary: true,
          icon: 'α',
          iconBg: 'rgba(96, 165, 250, 0.12)',
          title: 'Meaning card',
          subtitle: 'Ask what the original word means',
          type: 'flashcard',
          front: `What does the ${language} word '${word}' mean?`,
          back: '[enter meaning]'
        },
        {
          id: 'etymology-reverse',
          icon: 'α',
          iconBg: 'rgba(96, 165, 250, 0.12)',
          title: 'Reverse lookup card',
          subtitle: 'Ask for the original word from the English idea',
          type: 'flashcard',
          front: `What is the ${language} origin of [the English term]?`,
          back: `'${word}'`
        },
        {
          id: 'etymology-format',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as study line',
          subtitle: 'Insert a structured markdown definition block',
          type: 'format',
          snippet: `- ${word} :: [meaning]\n- ${language} root :: [context]`
        }
      ];
    }

    case 'formula': {
      const isChemical = line.includes('→');
      return [
        {
          id: 'formula-recall',
          isPrimary: true,
          icon: '∑',
          iconBg: 'rgba(251, 191, 36, 0.16)',
          title: isChemical ? 'Equation recall card' : 'Formula recall card',
          subtitle: 'Ask for the full expression',
          type: 'flashcard',
          front: isChemical ? 'Write the balanced equation for [reaction].' : 'State the formula for [concept].',
          back: line
        },
        {
          id: 'formula-usage',
          icon: '∑',
          iconBg: 'rgba(251, 191, 36, 0.16)',
          title: 'When-to-use card',
          subtitle: 'Ask when this formula applies',
          type: 'flashcard',
          front: `When do you use: ${line.slice(0, 40)}${line.length > 40 ? '...' : ''}`,
          back: '[describe the condition or context]'
        },
        {
          id: 'formula-parts',
          icon: '⬡',
          iconBg: 'rgba(59, 130, 246, 0.12)',
          title: 'Component definition card',
          subtitle: 'Ask what each symbol means',
          type: 'flashcard',
          front: `In "${line}", what does each symbol represent?`,
          back: '[define each component]'
        }
      ];
    }

    case 'drug':
      return [
        {
          id: 'drug-full',
          isPrimary: true,
          icon: 'Rx',
          iconBg: 'rgba(16, 185, 129, 0.14)',
          title: 'Full drug profile card',
          subtitle: 'Class, indication, side effect, and nursing consideration',
          type: 'flashcard',
          front: `${line} — class, indication, key side effect, nursing consideration?`,
          back: 'Class: [drug class]\nIndication: [what it treats]\nKey SE: [main side effect]\nNursing: [key consideration]'
        },
        {
          id: 'drug-mechanism',
          icon: 'Rx',
          iconBg: 'rgba(16, 185, 129, 0.14)',
          title: 'Mechanism of action card',
          subtitle: 'Ask how the medication works',
          type: 'flashcard',
          front: `How does ${line} work (mechanism of action)?`,
          back: '[describe mechanism]'
        },
        {
          id: 'drug-safety',
          icon: '⚠',
          iconBg: 'rgba(251, 191, 36, 0.16)',
          title: 'Safety card',
          subtitle: 'Ask for the key contraindication',
          type: 'flashcard',
          front: `What is the primary contraindication for ${line}?`,
          back: '[key contraindication and reason]'
        }
      ];

    case 'labvalue':
      return [
        {
          id: 'lab-range',
          isPrimary: true,
          icon: '⚗',
          iconBg: 'rgba(132, 204, 22, 0.14)',
          title: 'Normal range card',
          subtitle: 'Ask for the normal range',
          type: 'flashcard',
          front: `What is the normal range for ${line.split(/[\d]/)[0].trim()}?`,
          back: `${line}\n[High = ?; Low = ?]`
        },
        {
          id: 'lab-critical',
          icon: '⚗',
          iconBg: 'rgba(239, 68, 68, 0.12)',
          title: 'Critical value card',
          subtitle: 'Ask when to notify immediately',
          type: 'flashcard',
          front: `What critical value for ${line.split(/[\d]/)[0].trim()} requires immediate action?`,
          back: '[critical high] or [critical low]'
        },
        {
          id: 'lab-format',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as reference table',
          subtitle: 'Insert a markdown lookup table',
          type: 'format',
          snippet: `| Item | Range | Notes |\n| --- | --- | --- |\n| ${line.split(/[\d]/)[0].trim()} | ${line} | |`
        }
      ];

    case 'mnemonic': {
      const acronym = String(context.metadata.acronym ?? line);
      return [
        {
          id: 'mnemonic-expand',
          isPrimary: true,
          icon: 'A→',
          iconBg: 'rgba(236, 72, 153, 0.14)',
          title: 'Expand the full mnemonic',
          subtitle: 'Ask what the letters stand for',
          type: 'flashcard',
          front: `What does ${acronym} stand for?`,
          back: '[expand each letter]'
        },
        {
          id: 'mnemonic-batch',
          icon: 'A→',
          iconBg: 'rgba(236, 72, 153, 0.14)',
          title: `Batch one card per letter (${acronym.length})`,
          subtitle: 'Create a separate card for each letter',
          type: 'batch',
          cards: acronym.split('').map((letter) => ({
            front: `${letter} in ${acronym}?`,
            back: `[what ${letter} stands for]`
          }))
        },
        {
          id: 'mnemonic-format',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as list',
          subtitle: 'Insert a structured list scaffold',
          type: 'format',
          snippet: `${acronym}\n- ${acronym[0] ?? 'A'} :: [meaning]\n- ${acronym[1] ?? 'B'} :: [meaning]`
        }
      ];
    }

    case 'classification': {
      const items = (context.metadata.items as string[] | undefined) ?? [];
      const noun = String(context.metadata.noun ?? 'items');
      return [
        {
          id: 'class-all',
          isPrimary: true,
          icon: '⬡',
          iconBg: 'rgba(59, 130, 246, 0.12)',
          title: `Name all ${context.metadata.count} ${noun}`,
          subtitle: 'Ask for the full set on one card',
          type: 'flashcard',
          front: `What are the ${context.metadata.count} ${noun} of [topic]?`,
          back: items.length > 0 ? items.map((item, index) => `${index + 1}. ${item}`).join('\n') : `[list the ${noun}]`
        },
        {
          id: 'class-batch',
          icon: '⬡',
          iconBg: 'rgba(59, 130, 246, 0.12)',
          title: `Batch one card per ${noun.replace(/s$/, '')}`,
          subtitle: 'Create one card per detected item',
          type: 'batch',
          cards: items.map((item) => ({
            front: `What is ${item}?`,
            back: `[define ${item}]`
          }))
        },
        {
          id: 'class-table',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as table',
          subtitle: 'Insert a markdown comparison table',
          type: 'format',
          snippet: `| ${noun.charAt(0).toUpperCase() + noun.slice(1)} | Description |\n| --- | --- |\n${items.map((item) => `| ${item} | |`).join('\n')}`
        }
      ];
    }

    case 'case': {
      const citation = String(context.metadata.citation ?? line);
      return [
        {
          id: 'case-rule',
          isPrimary: true,
          icon: '⚖',
          iconBg: 'rgba(239, 68, 68, 0.12)',
          title: 'Case brief card',
          subtitle: 'Ask for the rule of law',
          type: 'flashcard',
          front: `${citation} — what rule of law does it establish?`,
          back: 'Rule: [state the rule]\nFacts: [brief facts]\nHolding: [outcome]'
        },
        {
          id: 'case-holding',
          icon: '⚖',
          iconBg: 'rgba(239, 68, 68, 0.12)',
          title: 'Holding-only card',
          subtitle: 'Ask for the one-line holding',
          type: 'flashcard',
          front: `What was the holding in ${citation}?`,
          back: '[one-sentence holding]'
        },
        {
          id: 'case-format',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as brief outline',
          subtitle: 'Insert Facts / Issue / Holding / Rule scaffold',
          type: 'format',
          snippet: `- Facts :: ${citation}\n- Issue :: [issue]\n- Holding :: [holding]\n- Rule :: [rule]`
        }
      ];
    }

    case 'comparison': {
      const marker = String(context.metadata.marker ?? 'contrast');
      return [
        {
          id: 'comparison-contrast',
          isPrimary: true,
          icon: '⇄',
          iconBg: 'rgba(16, 185, 129, 0.14)',
          title: 'Contrast card',
          subtitle: marker === 'cause' ? 'Ask for the effect' : 'Ask for the change',
          type: 'flashcard',
          front: marker === 'cause' ? 'What causes or results in [outcome]?' : 'How did [topic] change before vs. after [event]?',
          back: '[describe the contrast or change]'
        },
        {
          id: 'comparison-reverse',
          icon: '⇄',
          iconBg: 'rgba(16, 185, 129, 0.14)',
          title: 'Reverse comparison card',
          subtitle: 'Ask in the opposite direction',
          type: 'flashcard',
          front: marker === 'cause' ? 'What effect follows [cause]?' : 'What was true before [topic]?',
          back: '[reverse the relationship]'
        },
        {
          id: 'comparison-format',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as two-column comparison',
          subtitle: 'Insert a compare/contrast table',
          type: 'format',
          snippet: `| Before | After |\n| --- | --- |\n| | |`
        }
      ];
    }

    case 'date': {
      const year = String(context.metadata.year ?? '');
      const event = String(context.metadata.event ?? line);
      return [
        {
          id: 'date-when',
          isPrimary: true,
          icon: '⌁',
          iconBg: 'rgba(251, 191, 36, 0.16)',
          title: 'Event recall card',
          subtitle: 'Ask what happened in the year',
          type: 'flashcard',
          front: `What happened in ${year}?`,
          back: event || line
        },
        {
          id: 'date-what',
          icon: '⌁',
          iconBg: 'rgba(251, 191, 36, 0.16)',
          title: 'Reverse timeline card',
          subtitle: 'Ask for the year from the event',
          type: 'flashcard',
          front: `When did ${event || line} happen?`,
          back: year
        },
        {
          id: 'date-timeline',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as timeline row',
          subtitle: 'Insert a simple timeline scaffold',
          type: 'format',
          snippet: `| Year | Event |\n| --- | --- |\n| ${year} | ${event} |`
        }
      ];
    }

    case 'nested': {
      const parentText = String(context.metadata.parentText ?? '');
      return [
        {
          id: 'nested-context',
          isPrimary: true,
          icon: '↳',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Context card',
          subtitle: 'Keep the parent context on the front',
          type: 'flashcard',
          front: parentText ? `${parentText} → ${line}` : line,
          back: '[answer or definition]'
        },
        {
          id: 'nested-batch',
          icon: '↳',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Batch from surrounding block',
          subtitle: 'Create cards from the nearby indented lines',
          type: 'batch',
          cards: extractBatchCards(allLines, lineIndex)
        },
        {
          id: 'nested-format',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as nested outline',
          subtitle: 'Insert a scaffold for the block',
          type: 'format',
          snippet: `- ${line}\n  - [subpoint]\n  - [subpoint]`
        }
      ];
    }

    case 'definition': {
      const term = String(context.metadata.term ?? line);
      const definition = String(context.metadata.definition ?? '');
      return [
        {
          id: 'def-card',
          isPrimary: true,
          icon: '≡',
          iconBg: 'rgba(96, 165, 250, 0.12)',
          title: 'Definition card',
          subtitle: 'Ask what the term means',
          type: 'flashcard',
          front: `What is ${term}?`,
          back: definition
        },
        {
          id: 'def-reverse',
          icon: '≡',
          iconBg: 'rgba(96, 165, 250, 0.12)',
          title: 'Reverse definition card',
          subtitle: 'Ask for the term from the definition',
          type: 'flashcard',
          front: `What term matches: ${definition || '[definition]'}`,
          back: term
        },
        {
          id: 'def-batch',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as glossary entry',
          subtitle: 'Insert a glossary scaffold',
          type: 'format',
          snippet: `- ${term} :: ${definition || '[definition]'}`
        }
      ];
    }

    default:
      return [
        {
          id: 'plain-primary',
          isPrimary: true,
          icon: '⬡',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Basic flashcard',
          subtitle: 'Create a direct prompt and answer card',
          type: 'flashcard',
          front: line,
          back: ''
        },
        {
          id: 'plain-format',
          icon: '⊞',
          iconBg: 'rgba(148, 163, 184, 0.12)',
          title: 'Format as outline',
          subtitle: 'Insert a blank card scaffold',
          type: 'format',
          snippet: `- ${line} :: [answer]`
        }
      ];
  }
}
