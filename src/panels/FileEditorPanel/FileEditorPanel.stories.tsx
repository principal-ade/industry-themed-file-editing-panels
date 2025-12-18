import type { Meta, StoryObj } from '@storybook/react';
import { FileEditorPanel } from './FileEditorPanel';
import type { FileContentProvider, FileSource } from '../../types';

// Mock file content
const mockTypeScriptContent = `import React, { useState } from 'react';

interface CounterProps {
  initialValue?: number;
}

export function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div className="counter">
      <button onClick={() => setCount(c => c - 1)}>-</button>
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
`;

const mockJsonContent = `{
  "name": "@industry-theme/file-editing-panels",
  "version": "0.1.0",
  "description": "File editing panels for dev workspaces",
  "main": "dist/index.js",
  "dependencies": {
    "react": "^19.0.0"
  }
}`;

const mockMarkdownContent = `# File Editor Panel

A code editor panel with syntax highlighting and editing capabilities.

## Features

- Syntax highlighting for 30+ languages
- Vim mode support
- Auto-save on file change
- Dirty state tracking

## Usage

\`\`\`tsx
import { FileEditorPanel } from '@industry-theme/file-editing-panels';

<FileEditorPanel
  filePath="/src/App.tsx"
  contentProvider={myProvider}
/>
\`\`\`
`;

const createMockContentProvider = (content: string): FileContentProvider => ({
  readFile: async () => content,
  writeFile: async (path, newContent) => {
    console.log('Saving file:', path, newContent.substring(0, 100) + '...');
  },
});

const readOnlyProvider: FileContentProvider = {
  readFile: async () => mockTypeScriptContent,
};

const meta: Meta<typeof FileEditorPanel> = {
  title: 'Panels/FileEditorPanel',
  component: FileEditorPanel,
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
type Story = StoryObj<typeof FileEditorPanel>;

export const TypeScriptFile: Story = {
  args: {
    filePath: '/src/components/Counter.tsx',
    source: { type: 'local', location: '/Users/dev/project' } as FileSource,
    contentProvider: createMockContentProvider(mockTypeScriptContent),
    onClose: () => console.log('Close clicked'),
  },
};

export const JsonFile: Story = {
  args: {
    filePath: '/package.json',
    source: { type: 'local', location: '/Users/dev/project' } as FileSource,
    contentProvider: createMockContentProvider(mockJsonContent),
    onClose: () => console.log('Close clicked'),
  },
};

export const MarkdownFile: Story = {
  args: {
    filePath: '/README.md',
    source: { type: 'local', location: '/Users/dev/project' } as FileSource,
    contentProvider: createMockContentProvider(mockMarkdownContent),
    onClose: () => console.log('Close clicked'),
  },
};

export const ReadOnlyMode: Story = {
  args: {
    filePath: '/src/components/Counter.tsx',
    source: { type: 'local' } as FileSource,
    contentProvider: readOnlyProvider,
    readOnly: true,
    onClose: () => console.log('Close clicked'),
  },
};

export const RemoteFile: Story = {
  args: {
    filePath: '/src/components/Counter.tsx',
    source: { type: 'remote' } as FileSource,
    contentProvider: createMockContentProvider(mockTypeScriptContent),
    onClose: () => console.log('Close clicked'),
  },
};

export const WithVimMode: Story = {
  args: {
    filePath: '/src/components/Counter.tsx',
    source: { type: 'local', location: '/Users/dev/project' } as FileSource,
    contentProvider: createMockContentProvider(mockTypeScriptContent),
    vimMode: true,
    onClose: () => console.log('Close clicked'),
  },
};

export const NoFileSelected: Story = {
  args: {
    filePath: null,
    contentProvider: createMockContentProvider(''),
  },
};

export const Loading: Story = {
  args: {
    filePath: '/src/App.tsx',
    source: { type: 'local' } as FileSource,
    contentProvider: {
      readFile: () => new Promise<string | null>(() => {}), // Never resolves
    },
  },
};

export const ErrorState: Story = {
  args: {
    filePath: '/src/missing-file.tsx',
    source: { type: 'local' } as FileSource,
    contentProvider: {
      readFile: async (): Promise<string | null> => {
        throw new globalThis.Error('File not found');
      },
    },
  },
};
