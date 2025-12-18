import type { Meta, StoryObj } from '@storybook/react';
import { GitDiffPanel } from './GitDiffPanel';
import type { DiffContentProvider, GitChangeStatus } from '../../types';

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

const createMockDiffProvider = (
  original: string,
  modified: string
): DiffContentProvider => ({
  getOriginal: async () => {
    console.log(
      'getOriginal called, returning:',
      original.substring(0, 50) + '...'
    );
    return original;
  },
  getModified: async () => {
    console.log(
      'getModified called, returning:',
      modified.substring(0, 50) + '...'
    );
    return modified;
  },
});

const meta: Meta<typeof GitDiffPanel> = {
  title: 'Panels/GitDiffPanel',
  component: GitDiffPanel,
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
type Story = StoryObj<typeof GitDiffPanel>;

export const UnstagedChanges: Story = {
  args: {
    filePath: 'src/components/Button.tsx',
    status: 'unstaged' as GitChangeStatus,
    diffProvider: createMockDiffProvider(
      mockOriginalContent,
      mockModifiedContent
    ),
    onClose: () => console.log('Close clicked'),
  },
};

export const StagedChanges: Story = {
  args: {
    filePath: 'src/components/Button.tsx',
    status: 'staged' as GitChangeStatus,
    diffProvider: createMockDiffProvider(
      mockOriginalContent,
      mockModifiedContent
    ),
    onClose: () => console.log('Close clicked'),
  },
};

export const UntrackedFile: Story = {
  args: {
    filePath: 'src/components/NewComponent.tsx',
    status: 'untracked' as GitChangeStatus,
    diffProvider: createMockDiffProvider('', mockModifiedContent),
    onClose: () => console.log('Close clicked'),
  },
};

export const DeletedFile: Story = {
  args: {
    filePath: 'src/components/OldComponent.tsx',
    status: 'deleted' as GitChangeStatus,
    diffProvider: createMockDiffProvider(mockOriginalContent, ''),
    onClose: () => console.log('Close clicked'),
  },
};

export const NoFileSelected: Story = {
  args: {
    filePath: null,
    diffProvider: createMockDiffProvider('', ''),
  },
};

export const Loading: Story = {
  args: {
    filePath: 'src/components/Button.tsx',
    status: 'unstaged' as GitChangeStatus,
    diffProvider: {
      getOriginal: () => new Promise<string | null>(() => {}), // Never resolves
      getModified: () => new Promise<string | null>(() => {}),
    },
  },
};

export const ErrorState: Story = {
  args: {
    filePath: 'src/components/Button.tsx',
    status: 'unstaged' as GitChangeStatus,
    diffProvider: {
      getOriginal: async (): Promise<string | null> => {
        throw new globalThis.Error('Failed to fetch original content');
      },
      getModified: async (): Promise<string | null> => {
        throw new globalThis.Error('Failed to fetch modified content');
      },
    },
  },
};
