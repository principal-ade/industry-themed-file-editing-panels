import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef } from 'react';
import { GitDiffPanel } from './GitDiffPanel';
import {
  createMockContext,
  createMockActions,
  createMockEvents,
  emitGitDiff,
} from '../../mocks/panelContext';
import type { PanelComponentProps, GitChangeStatus } from '../../types';

// Mock diff content for stories
const mockOriginalContent = `import React from 'react';

export function Button({ label, onClick }) {
  return (
    <button onClick={onClick}>
      {label}
    </button>
  );
}`;

const mockModifiedContent = `import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={\`btn btn-\${variant}\`}
    >
      {label}
    </button>
  );
}`;

// Helper component that wraps GitDiffPanel with mock context
const GitDiffPanelWithMocks = ({
  initialFilePath,
  status = 'unstaged',
  original = '',
  modified = '',
}: {
  initialFilePath?: string;
  status?: GitChangeStatus;
  original?: string;
  modified?: string;
}) => {
  const context = createMockContext();
  const actions = createMockActions();
  const events = createMockEvents();
  const hasEmittedRef = useRef(false);

  useEffect(() => {
    if (initialFilePath && !hasEmittedRef.current) {
      hasEmittedRef.current = true;
      // Small delay to ensure component is mounted
      setTimeout(() => {
        emitGitDiff(events, initialFilePath, status, original, modified);
      }, 100);
    }
  }, [initialFilePath, status, original, modified, events]);

  const props: PanelComponentProps = { context, actions, events };
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <GitDiffPanel {...props} />
    </div>
  );
};

const meta: Meta<typeof GitDiffPanelWithMocks> = {
  title: 'Panels/GitDiffPanel',
  component: GitDiffPanelWithMocks,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GitDiffPanelWithMocks>;

export const UnstagedChanges: Story = {
  args: {
    initialFilePath: 'src/components/Button.tsx',
    status: 'unstaged',
    original: mockOriginalContent,
    modified: mockModifiedContent,
  },
};

export const StagedChanges: Story = {
  args: {
    initialFilePath: 'src/components/Button.tsx',
    status: 'staged',
    original: mockOriginalContent,
    modified: mockModifiedContent,
  },
};

export const UntrackedFile: Story = {
  args: {
    initialFilePath: 'src/components/NewComponent.tsx',
    status: 'untracked',
    original: '',
    modified: mockModifiedContent,
  },
};

export const DeletedFile: Story = {
  args: {
    initialFilePath: 'src/components/OldComponent.tsx',
    status: 'deleted',
    original: mockOriginalContent,
    modified: '',
  },
};

export const NoFileSelected: Story = {
  args: {
    initialFilePath: undefined,
  },
};
