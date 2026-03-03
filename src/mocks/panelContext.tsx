import React from 'react';
import type {
  PanelComponentProps,
  PanelContextValue,
  PanelActions,
  PanelEventEmitter,
  PanelEvent,
  PanelEventType,
} from '../types';

/**
 * Create a mock file system adapter for Storybook
 * Stores files in memory and logs operations
 */
export const createMockFileSystemAdapter = (
  initialFiles?: Record<string, string>
) => {
  const files = new Map<string, string>(Object.entries(initialFiles || {}));

  return {
    exists: async (path: string) => files.has(path),
    readFile: async (path: string) => {
      const content = files.get(path);
      if (content === undefined) throw new Error(`File not found: ${path}`);
      return content;
    },
    writeFile: async (path: string, content: string) => {
      // eslint-disable-next-line no-console
      console.log('[Mock FS] Writing file:', path);
      files.set(path, content);
    },
    deleteFile: async (path: string) => {
      // eslint-disable-next-line no-console
      console.log('[Mock FS] Deleting file:', path);
      files.delete(path);
    },
    createDir: async (path: string) => {
      // eslint-disable-next-line no-console
      console.log('[Mock FS] Creating directory:', path);
    },
    readDir: async (path: string) => {
      const prefix = path.endsWith('/') ? path : path + '/';
      const entries = new Set<string>();
      for (const key of files.keys()) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const firstSegment = rest.split('/')[0];
          if (firstSegment) entries.add(firstSegment);
        }
      }
      return Array.from(entries);
    },
    isDirectory: async (path: string) => {
      const prefix = path.endsWith('/') ? path : path + '/';
      for (const key of files.keys()) {
        if (key.startsWith(prefix)) return true;
      }
      return false;
    },
    // Expose the internal files map for testing
    _files: files,
  };
};

/**
 * Sample file content for mock file system
 */
const mockFileContent: Record<string, string> = {
  '/Users/developer/my-project/src/index.ts': `import { greet } from './utils';

export function main() {
  console.log(greet('World'));
}

main();
`,
  '/Users/developer/my-project/src/utils.ts': `export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export function add(a: number, b: number): number {
  return a + b;
}
`,
  '/Users/developer/my-project/README.md': `# My Project

A sample project for testing the file editor panel.

## Features

- Feature 1
- Feature 2
- Feature 3

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  '/Users/developer/my-project/package.json': `{
  "name": "my-project",
  "version": "1.0.0",
  "main": "src/index.ts",
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc"
  }
}
`,
};

/**
 * Base mock context with just the core fields (no typed slices)
 */
export const createMockBaseContext = (
  initialFiles?: Record<string, string>
): PanelContextValue => {
  const mockFileSystem = createMockFileSystemAdapter({
    ...mockFileContent,
    ...initialFiles,
  });

  return {
    currentScope: {
      type: 'repository',
      workspace: {
        name: 'my-workspace',
        path: '/Users/developer/my-workspace',
      },
      repository: {
        name: 'my-project',
        path: '/Users/developer/my-project',
      },
    },
    adapters: {
      fileSystem: mockFileSystem,
    },
    refresh: async (
      scope?: 'workspace' | 'repository',
      slice?: string
    ): Promise<void> => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Context refresh called', { scope, slice });
    },
  };
};

/**
 * Mock Panel Context for Storybook (legacy compatibility)
 * @deprecated Use createMockBaseContext or typed context creators instead
 */
export const createMockContext = (
  overrides?: Partial<PanelContextValue>,
  initialFiles?: Record<string, string>,
  _options?: { vimMode?: boolean }
): PanelContextValue => {
  const baseContext = createMockBaseContext(initialFiles);
  return { ...baseContext, ...overrides };
};

/**
 * Mock Panel Actions for Storybook
 */
export const createMockActions = (
  overrides?: Partial<PanelActions>
): PanelActions => ({
  openFile: (filePath: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Opening file:', filePath);
  },
  openGitDiff: (filePath: string, status) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Opening git diff:', filePath, status);
  },
  navigateToPanel: (panelId: string) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Navigating to panel:', panelId);
  },
  notifyPanels: (event) => {
    // eslint-disable-next-line no-console
    console.log('[Mock] Notifying panels:', event);
  },
  ...overrides,
});

/**
 * Mock Event Emitter for Storybook
 */
export const createMockEvents = (): PanelEventEmitter => {
  const handlers = new Map<
    PanelEventType,
    Set<(event: PanelEvent<unknown>) => void>
  >();

  return {
    emit: (event) => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Emitting event:', event);
      const eventHandlers = handlers.get(event.type);
      if (eventHandlers) {
        eventHandlers.forEach((handler) => handler(event));
      }
    },
    on: (type, handler) => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Subscribing to event:', type);
      if (!handlers.has(type)) {
        handlers.set(type, new Set());
      }
      handlers.get(type)!.add(handler as (event: PanelEvent<unknown>) => void);

      // Return cleanup function
      return () => {
        // eslint-disable-next-line no-console
        console.log('[Mock] Unsubscribing from event:', type);
        handlers
          .get(type)
          ?.delete(handler as (event: PanelEvent<unknown>) => void);
      };
    },
    off: (type, handler) => {
      // eslint-disable-next-line no-console
      console.log('[Mock] Removing event handler:', type);
      handlers
        .get(type)
        ?.delete(handler as (event: PanelEvent<unknown>) => void);
    },
  };
};

/**
 * Mock Panel Props Provider
 * Wraps components with mock context for Storybook
 * Note: Assumes ThemeProvider is provided by parent (e.g., Storybook decorator)
 */
export const MockPanelProvider: React.FC<{
  children: (props: PanelComponentProps) => React.ReactNode;
  contextOverrides?: Partial<PanelContextValue>;
  actionsOverrides?: Partial<PanelActions>;
  initialFiles?: Record<string, string>;
  vimMode?: boolean;
}> = ({ children, contextOverrides, actionsOverrides, initialFiles, vimMode }) => {
  const context = createMockContext(contextOverrides, initialFiles, { vimMode });
  const actions = createMockActions(actionsOverrides);
  const events = createMockEvents();

  return <>{children({ context, actions, events })}</>;
};

/**
 * Helper to emit a file:open event for testing
 */
export const emitFileOpen = (
  events: PanelEventEmitter,
  filePath: string
) => {
  events.emit({
    type: 'file:open',
    source: 'mock',
    timestamp: Date.now(),
    payload: { path: filePath },
  });
};

/**
 * Helper to emit a git:diff event for testing
 */
export const emitGitDiff = (
  events: PanelEventEmitter,
  filePath: string,
  status: 'staged' | 'unstaged' | 'untracked' | 'deleted',
  original?: string,
  modified?: string
) => {
  events.emit({
    type: 'git:diff',
    source: 'mock',
    timestamp: Date.now(),
    payload: { path: filePath, status, original, modified },
  });
};
