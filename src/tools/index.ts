/**
 * Panel Tools
 *
 * UTCP-compatible tools for file editing panels.
 * These tools can be invoked by AI agents and emit events that panels listen for.
 *
 * IMPORTANT: This file should NOT import any React components to ensure
 * it can be imported server-side without pulling in React dependencies.
 * Use the './tools' subpath export for server-safe imports.
 */

import type { PanelTool, PanelToolsMetadata } from '@principal-ade/utcp-panel-event';

/**
 * Tool: Open File in Editor
 */
export const openFileTool: PanelTool = {
  name: 'open_file',
  description: 'Opens a file in the file editor panel',
  inputs: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to open',
      },
      readOnly: {
        type: 'boolean',
        description: 'Whether to open the file in read-only mode',
      },
    },
    required: ['filePath'],
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      filePath: { type: 'string' },
    },
  },
  tags: ['file', 'editor', 'open'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'file-editing-panels:open-file',
  },
};

/**
 * Tool: View Git Diff
 */
export const viewDiffTool: PanelTool = {
  name: 'view_diff',
  description: 'Opens a file in the git diff panel to view changes',
  inputs: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to diff',
      },
      status: {
        type: 'string',
        enum: ['staged', 'unstaged', 'untracked', 'deleted'],
        description: 'The git status of the file',
      },
    },
    required: ['filePath'],
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      filePath: { type: 'string' },
    },
  },
  tags: ['git', 'diff', 'view'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'file-editing-panels:view-diff',
  },
};

/**
 * Tool: Open Markdown Editor
 */
export const openMarkdownTool: PanelTool = {
  name: 'open_markdown',
  description: 'Opens a markdown file in the MDX editor panel',
  inputs: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the markdown file to open',
      },
      readOnly: {
        type: 'boolean',
        description: 'Whether to open the file in read-only mode',
      },
    },
    required: ['filePath'],
  },
  outputs: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      filePath: { type: 'string' },
    },
  },
  tags: ['markdown', 'mdx', 'editor'],
  tool_call_template: {
    call_template_type: 'panel_event',
    event_type: 'file-editing-panels:open-markdown',
  },
};

/**
 * All tools exported as an array.
 */
export const fileEditingPanelTools: PanelTool[] = [
  openFileTool,
  viewDiffTool,
  openMarkdownTool,
];

/**
 * Panel tools metadata for registration with PanelToolRegistry.
 */
export const fileEditingPanelToolsMetadata: PanelToolsMetadata = {
  id: 'industry-theme.file-editing-panels',
  name: 'File Editing Panels',
  description: 'Tools for file editing, git diff viewing, and markdown editing',
  tools: fileEditingPanelTools,
};
