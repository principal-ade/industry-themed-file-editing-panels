import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef } from 'react';
import { FileEditorPanel, type FileEditorPanelProps } from './FileEditorPanel';
import {
  createMockBaseContext,
  createMockFileSystemAdapter,
  createMockEvents,
  emitFileOpen,
} from '../../mocks/panelContext';
import type {
  FileEditorPanelActions,
  FileEditorPanelContext,
  PanelContextValue,
} from '../../types';

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
  context={context}
  actions={actions}
  events={events}
/>
\`\`\`
`;

// Helper to create typed context for FileEditorPanel
const createFileEditorContext = (
  initialFiles?: Record<string, string>,
  vimMode = false
): PanelContextValue<FileEditorPanelContext> => {
  const baseContext = createMockBaseContext(initialFiles);
  return {
    ...baseContext,
    activeFile: {
      scope: 'repository',
      name: 'active-file',
      data: null,
      loading: false,
      error: null,
      refresh: async () => {},
    },
    preferences: {
      scope: 'repository',
      name: 'preferences',
      data: { vimMode },
      loading: false,
      error: null,
      refresh: async () => {},
    },
  };
};

// Helper to create typed actions for FileEditorPanel
const createFileEditorActions = (
  fileSystem: ReturnType<typeof createMockFileSystemAdapter>
): FileEditorPanelActions => ({
  readFile: async (path: string) => fileSystem.readFile(path),
  writeFile: async (path: string, content: string) =>
    fileSystem.writeFile(path, content),
});

// Helper component that wraps FileEditorPanel with mock context
const FileEditorPanelWithMocks = ({
  initialFilePath,
  initialFiles,
  vimMode = false,
}: {
  initialFilePath?: string;
  initialFiles?: Record<string, string>;
  vimMode?: boolean;
}) => {
  const fileSystem = createMockFileSystemAdapter(initialFiles);
  const context = createFileEditorContext(initialFiles, vimMode);
  const actions = createFileEditorActions(fileSystem);
  const events = createMockEvents();
  const hasEmittedRef = useRef(false);

  useEffect(() => {
    if (initialFilePath && !hasEmittedRef.current) {
      hasEmittedRef.current = true;
      // Small delay to ensure component is mounted
      setTimeout(() => {
        emitFileOpen(events, initialFilePath);
      }, 100);
    }
  }, [initialFilePath, events]);

  const props: FileEditorPanelProps = { context, actions, events };
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <FileEditorPanel {...props} />
    </div>
  );
};

const meta: Meta<typeof FileEditorPanelWithMocks> = {
  title: 'Panels/FileEditorPanel',
  component: FileEditorPanelWithMocks,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FileEditorPanelWithMocks>;

export const TypeScriptFile: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/src/Counter.tsx',
    initialFiles: {
      '/Users/developer/my-project/src/Counter.tsx': mockTypeScriptContent,
    },
  },
};

export const JsonFile: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/package.json',
    initialFiles: {
      '/Users/developer/my-project/package.json': mockJsonContent,
    },
  },
};

export const MarkdownFile: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/README.md',
    initialFiles: {
      '/Users/developer/my-project/README.md': mockMarkdownContent,
    },
  },
};

export const NoFileSelected: Story = {
  args: {
    initialFilePath: undefined,
  },
};

export const MultipleFiles: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/src/Counter.tsx',
    initialFiles: {
      '/Users/developer/my-project/src/Counter.tsx': mockTypeScriptContent,
      '/Users/developer/my-project/package.json': mockJsonContent,
      '/Users/developer/my-project/README.md': mockMarkdownContent,
    },
  },
};

export const WithVimMode: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/src/Counter.tsx',
    initialFiles: {
      '/Users/developer/my-project/src/Counter.tsx': mockTypeScriptContent,
    },
    vimMode: true,
  },
};
