import SynthesizeButton from '../ai/SynthesizeButton';
import { TabPlacement } from '../../types';

export type RightPanel = 'study' | 'flashcards';

export interface ToolRenderContext {
  noteId: number | null;
  rightPanel: RightPanel;
  setRightPanel: (panel: RightPanel) => void;
  tabPlacement: TabPlacement;
  setTabPlacement: (placement: TabPlacement) => void;
}

export interface ToolDefinition {
  id: string;
  label: string;
  group: 'Panels' | 'AI' | 'Layout';
  defaultPinned?: boolean;
  render: (ctx: ToolRenderContext) => JSX.Element;
}

export const defaultTools: ToolDefinition[] = [
  {
    id: 'panel-study',
    label: 'Study',
    group: 'Panels',
    defaultPinned: true,
    render: (ctx) => (
      <button
        onClick={() => ctx.setRightPanel('study')}
        style={{ background: ctx.rightPanel === 'study' ? '#dff1e4' : '#fff' }}
      >
        Study Mode
      </button>
    )
  },
  {
    id: 'panel-flashcards',
    label: 'Flashcards',
    group: 'Panels',
    defaultPinned: true,
    render: (ctx) => (
      <button
        onClick={() => ctx.setRightPanel('flashcards')}
        style={{ background: ctx.rightPanel === 'flashcards' ? '#dff1e4' : '#fff' }}
      >
        Flashcards
      </button>
    )
  },
  {
    id: 'synthesize',
    label: 'Synthesize',
    group: 'AI',
    defaultPinned: true,
    render: (ctx) => <SynthesizeButton noteId={ctx.noteId} />
  },
  {
    id: 'tabs-top',
    label: 'Tabs Top',
    group: 'Layout',
    render: (ctx) => (
      <button
        onClick={() => ctx.setTabPlacement('top')}
        style={{ background: ctx.tabPlacement === 'top' ? '#dff1e4' : '#fff' }}
      >
        Tabs Top
      </button>
    )
  },
  {
    id: 'tabs-left',
    label: 'Tabs Left',
    group: 'Layout',
    render: (ctx) => (
      <button
        onClick={() => ctx.setTabPlacement('left')}
        style={{ background: ctx.tabPlacement === 'left' ? '#dff1e4' : '#fff' }}
      >
        Tabs Left
      </button>
    )
  }
];
