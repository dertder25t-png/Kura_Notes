import SynthesizeButton from '../ai/SynthesizeButton';
import { TabPlacement } from '../../types';
import Icon from '../ui/Icon';

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
        title="Study mode"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: ctx.rightPanel === 'study' ? 'rgba(111, 126, 168, 0.18)' : 'rgba(255, 255, 255, 0.03)'
        }}
      >
        <Icon name="study" /> Study
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
        title="Flashcards"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: ctx.rightPanel === 'flashcards' ? 'rgba(111, 126, 168, 0.18)' : 'rgba(255, 255, 255, 0.03)'
        }}
      >
        <Icon name="flashcards" /> Flashcards
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
        title="Tabs on top"
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: ctx.tabPlacement === 'top' ? 'rgba(111, 126, 168, 0.18)' : 'rgba(255, 255, 255, 0.03)' }}
      >
        <Icon name="layout-top" /> Top
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
        title="Tabs on left"
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: ctx.tabPlacement === 'left' ? 'rgba(111, 126, 168, 0.18)' : 'rgba(255, 255, 255, 0.03)' }}
      >
        <Icon name="layout-left" /> Left
      </button>
    )
  }
];
