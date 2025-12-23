/**
 * @industry-theme/file-editing-panels
 *
 * Git diff view and editor panels for dev workspaces.
 * These panels use the panel framework pattern with PanelComponentProps.
 */

import { FileEditorPanel } from './panels/FileEditorPanel';
import { GitDiffPanel } from './panels/GitDiffPanel';
import { MDXEditorPanel } from './panels/MDXEditorPanel';
import type { PanelDefinition, PanelContextValue } from './types';
import { fileEditingPanelTools, fileEditingPanelToolsMetadata } from './tools';

/**
 * Export array of panel definitions.
 * This is the required export for panel extensions.
 */
export const panels: PanelDefinition[] = [
  {
    metadata: {
      id: 'industry-theme.file-editor',
      name: 'File Editor',
      icon: '📝',
      version: '0.1.0',
      author: 'Industry Theme',
      description: 'Monaco-based code editor with syntax highlighting',
      slices: ['active-file', 'fileTree'],
      tools: [fileEditingPanelTools[0]], // openFileTool
    },
    component: FileEditorPanel,

    onMount: async (context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log(
        'File Editor Panel mounted',
        context.currentScope.repository?.path
      );
    },

    onUnmount: async (_context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log('File Editor Panel unmounting');
    },
  },
  {
    metadata: {
      id: 'industry-theme.git-diff',
      name: 'Git Diff',
      icon: '🔀',
      version: '0.1.0',
      author: 'Industry Theme',
      description: 'Side-by-side git diff viewer',
      slices: ['git', 'fileTree'],
      tools: [fileEditingPanelTools[1]], // viewDiffTool
    },
    component: GitDiffPanel,

    onMount: async (context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log(
        'Git Diff Panel mounted',
        context.currentScope.repository?.path
      );
    },

    onUnmount: async (_context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log('Git Diff Panel unmounting');
    },
  },
  {
    metadata: {
      id: 'industry-theme.mdx-editor',
      name: 'MDX Editor',
      icon: '📄',
      version: '0.1.0',
      author: 'Industry Theme',
      description: 'Rich markdown/MDX editor with live preview',
      slices: ['active-file', 'fileTree'],
      tools: [fileEditingPanelTools[2]], // openMarkdownTool
    },
    component: MDXEditorPanel,

    onMount: async (context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log(
        'MDX Editor Panel mounted',
        context.currentScope.repository?.path
      );
    },

    onUnmount: async (_context: PanelContextValue) => {
      // eslint-disable-next-line no-console
      console.log('MDX Editor Panel unmounting');
    },
  },
];

/**
 * Optional: Called once when the entire package is loaded.
 * Use this for package-level initialization.
 */
export const onPackageLoad = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package loaded - File Editing Panels');
};

/**
 * Optional: Called once when the package is unloaded.
 * Use this for package-level cleanup.
 */
export const onPackageUnload = async () => {
  // eslint-disable-next-line no-console
  console.log('Panel package unloading - File Editing Panels');
};

/**
 * Export tools for server-safe imports.
 * Use '@industry-theme/file-editing-panels/tools' to import without React dependencies.
 */
export {
  fileEditingPanelTools,
  fileEditingPanelToolsMetadata,
  openFileTool,
  viewDiffTool,
  openMarkdownTool,
} from './tools';

// Re-export panel components for direct usage
export { FileEditorPanel, FileEditorPanelPreview } from './panels/FileEditorPanel';
export { GitDiffPanel, GitDiffPanelPreview } from './panels/GitDiffPanel';
export { MDXEditorPanel, MDXEditorPanelPreview } from './panels/MDXEditorPanel';

// Re-export types
export type { GitChangeStatus } from './types';

// Re-export framework types for convenience
export type {
  PanelDefinition,
  PanelContextValue,
  PanelMetadata,
  PanelComponentProps,
} from './types';
