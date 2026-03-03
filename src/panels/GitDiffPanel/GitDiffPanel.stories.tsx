import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef } from 'react';
import { GitDiffPanel, type GitDiffPanelProps } from './GitDiffPanel';
import {
  createMockBaseContext,
  createMockEvents,
  emitGitDiff,
} from '../../mocks/panelContext';
import type {
  GitDiffPanelActions,
  GitDiffPanelContext,
  GitChangeStatus,
  PanelContextValue,
} from '../../types';

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

// Helper to create typed context for GitDiffPanel
const createGitDiffContext = (): PanelContextValue<GitDiffPanelContext> => {
  return createMockBaseContext();
};

// Helper to create typed actions for GitDiffPanel
const createGitDiffActions = (
  fileContents: Record<string, string>,
  revisionContents: Record<string, string>
): GitDiffPanelActions => ({
  readFile: async (path: string) => fileContents[path] ?? '',
  getFileContentAtRevision: async (path: string, _revision: string) =>
    revisionContents[path] ?? '',
});

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
  const context = createGitDiffContext();
  const actions = createGitDiffActions(
    initialFilePath ? { [initialFilePath]: modified } : {},
    initialFilePath ? { [initialFilePath]: original } : {}
  );
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

  const props: GitDiffPanelProps = { context, actions, events };
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
      <div style={{ height: '100vh', width: '100%' }}>
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

// ============================================================================
// Method 1: Event-Based (Pre-Fetched Content) - For Web/API Use Cases
// ============================================================================

/**
 * This story demonstrates Method 1: Event-Based approach
 *
 * BEST FOR: Web-based PR reviews, API-driven diffs, remote content
 *
 * How it works:
 * 1. Host fetches both original and modified content (e.g., from GitHub API)
 * 2. Emits 'git:diff' event with both content strings
 * 3. Panel displays immediately without any file system access
 *
 * Use this when:
 * - Reviewing PRs in web-ADE
 * - Comparing remote file versions
 * - Content is fetched from APIs
 * - No local file system available
 */
export const EventBasedPRReview: Story = {
  args: {
    initialFilePath: 'src/api/userService.ts',
    status: 'unstaged',
    original: `export async function getUser(id: string) {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}

export async function updateUser(id: string, data: any) {
  const response = await fetch(\`/api/users/\${id}\`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}`,
    modified: `export interface User {
  id: string;
  name: string;
  email: string;
}

export async function getUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  if (!response.ok) {
    throw new Error(\`Failed to fetch user: \${response.statusText}\`);
  }
  return response.json();
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(\`Failed to update user: \${response.statusText}\`);
  }
  return response.json();
}`,
  },
  parameters: {
    docs: {
      description: {
        story: `
**Example Usage in Web-ADE:**

\`\`\`typescript
// Fetch PR file from GitHub API
const prFile = await octokit.pulls.getFile({
  owner: 'acme',
  repo: 'myapp',
  pull_number: 123,
  path: 'src/api/userService.ts'
});

// Fetch both base and head content
const baseContent = await fetchFileContent(prFile.blob_url); // base commit
const headContent = await fetchFileContent(prFile.raw_url);  // PR head

// Emit event to GitDiffPanel
events.emit({
  type: 'git:diff',
  payload: {
    path: prFile.filename,
    status: 'modified',
    original: baseContent,
    modified: headContent
  }
});
\`\`\`

✅ No file system adapter needed
✅ Works in browser
✅ Perfect for API-driven workflows
        `,
      },
    },
  },
};

// ============================================================================
// Method 2: File System Adapter (Auto-Fetch) - For Desktop/Local Use Cases
// ============================================================================

/**
 * This story demonstrates Method 2: File System Adapter approach
 *
 * BEST FOR: Desktop apps, local git repositories, Electron environments
 *
 * How it works:
 * 1. Host provides fileSystem adapter with readFile() and getFileContentAtRevision()
 * 2. Panel receives filePath prop or event
 * 3. Panel automatically fetches content via adapter
 * 4. Panel generates and displays diff
 *
 * Use this when:
 * - Desktop Electron app (like this one)
 * - Local git repository access
 * - File system is available
 * - Want automatic content fetching
 */
const GitDiffPanelWithFileSystem = () => {
  const context = createGitDiffContext();
  const actions: GitDiffPanelActions = {
    readFile: async (filePath: string) => {
      console.log('[FileSystem Adapter] Reading file:', filePath);
      return mockModifiedContent;
    },
    getFileContentAtRevision: async (filePath: string, revision: string) => {
      console.log('[FileSystem Adapter] Reading from git:', filePath, 'at', revision);
      return mockOriginalContent;
    },
  };
  const events = createMockEvents();

  const hasEmittedRef = useRef(false);

  useEffect(() => {
    if (!hasEmittedRef.current) {
      hasEmittedRef.current = true;
      setTimeout(() => {
        // Just emit path and status - panel will auto-fetch content
        emitGitDiff(
          events,
          'src/components/Button.tsx',
          'unstaged'
          // NO original/modified content - panel fetches via adapter
        );
      }, 100);
    }
  }, [events]);

  const props: GitDiffPanelProps = { context, actions, events };
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <GitDiffPanel {...props} />
    </div>
  );
};

export const FileSystemAdapterDesktop: StoryObj = {
  render: () => <GitDiffPanelWithFileSystem />,
  parameters: {
    docs: {
      description: {
        story: `
**Example Usage in Desktop App:**

\`\`\`typescript
// In RepositoryPanelContext (Desktop)
context.adapters = {
  fileSystem: {
    readFile: async (filePath) => {
      // Read current file from disk
      return await FileSystemService.readFile(filePath);
    },

    getFileContentAtRevision: async (filePath, revision = 'HEAD') => {
      // Use IPC to call git executor
      const pathRelativeToRepo = calculateRelativePath(filePath);
      return await FileSystemService.getFileContentAtRevision(
        repositoryPath,
        pathRelativeToRepo,
        revision
      );
    },
  }
};

// Open file in diff panel
events.emit({
  type: 'git:diff',
  payload: {
    path: '/full/path/to/file.ts',
    status: 'unstaged'
    // Panel will auto-fetch via adapter
  }
});
\`\`\`

✅ Automatic content fetching
✅ Direct git integration
✅ Perfect for desktop/Electron apps
        `,
      },
    },
  },
};
