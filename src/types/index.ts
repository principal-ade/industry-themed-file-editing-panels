/**
 * Panel Extension Type Definitions
 *
 * Re-exports core types from @principal-ade/panel-framework-core
 */

// Import types needed for extending in this file
import type {
  PanelActions,
  DataSlice,
  ActiveFileSlice,
} from '@principal-ade/panel-framework-core';

// Re-export all core types from panel-framework-core
export type {
  // Core data types
  DataSlice,
  WorkspaceMetadata,
  RepositoryMetadata,
  FileTreeSource,
  ActiveFileSlice,

  // Event system
  PanelEventType,
  PanelEvent,
  PanelEventEmitter,

  // Panel interface
  PanelActions,
  PanelContextValue,
  PanelComponentProps,

  // Panel definition
  PanelMetadata,
  PanelLifecycleHooks,
  PanelDefinition,
  PanelModule,

  // Registry types
  PanelRegistryEntry,
  PanelLoader,
  PanelRegistryConfig,

  // Tool types (UTCP-compatible)
  PanelTool,
  PanelToolsMetadata,
  JsonSchema,
  PanelEventCallTemplate,
} from '@principal-ade/panel-framework-core';

/**
 * Git change status types for diff viewing
 */
export type GitChangeStatus = 'staged' | 'unstaged' | 'untracked' | 'deleted';

/**
 * Provider interface for reading/writing file content.
 * Consumers must implement this to connect the panels to their file system.
 */
export interface FileContentProvider {
  /** Read file content from the given path */
  readFile: (path: string) => Promise<string | null>;
  /** Write content to the given path (optional - enables editing) */
  writeFile?: (path: string, content: string) => Promise<void>;
  /** Watch a file for changes and call callback when changed (optional) */
  watchFile?: (path: string, callback: () => void) => () => void;
}

/**
 * Provider interface for git diff content.
 * Consumers must implement this to show git diffs.
 */
export interface DiffContentProvider {
  /** Get the original (baseline) content for comparison */
  getOriginal: (
    path: string,
    status: GitChangeStatus
  ) => Promise<string | null>;
  /** Get the modified (working tree) content */
  getModified: (
    path: string,
    status: GitChangeStatus
  ) => Promise<string | null>;
}

/**
 * File source information for determining read/write capabilities
 */
export interface FileSource {
  type: 'local' | 'remote';
  location?: string;
}

// ===========================
// Typed Panel Interfaces
// ===========================

/**
 * User preferences shape for FileEditorPanel
 */
export interface UserPreferencesSlice {
  vimMode?: boolean;
  // other preferences...
}

/**
 * Actions for FileEditorPanel
 */
export interface FileEditorPanelActions extends PanelActions {
  /** Read file content (REQUIRED) */
  readFile: (path: string) => Promise<string>;
  /** Write file content (REQUIRED for editing) */
  writeFile: (path: string, content: string) => Promise<void>;
}

/**
 * Context for FileEditorPanel
 */
export interface FileEditorPanelContext {
  /** Active file slice */
  activeFile: DataSlice<ActiveFileSlice>;
  /** User preferences slice (optional) */
  preferences?: DataSlice<UserPreferencesSlice>;
}

/**
 * Actions for GitDiffPanel
 */
export interface GitDiffPanelActions extends PanelActions {
  /** Read file content (REQUIRED) */
  readFile: (path: string) => Promise<string>;
  /** Get file content at a specific git revision (REQUIRED for diff view) */
  getFileContentAtRevision: (path: string, revision: string) => Promise<string>;
}

/**
 * Context for GitDiffPanel
 * GitDiffPanel primarily uses events (git:diff) rather than slices
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GitDiffPanelContext {
  // GitDiffPanel doesn't require any specific slices
  // It uses git:diff events to receive git diff information
}

/**
 * Actions for MDXEditorPanel
 */
export interface MDXEditorPanelActions extends PanelActions {
  /** Read file content (REQUIRED) */
  readFile: (path: string) => Promise<string>;
  /** Write file content (REQUIRED for editing) */
  writeFile: (path: string, content: string) => Promise<void>;
}

/**
 * Context for MDXEditorPanel
 */
export interface MDXEditorPanelContext {
  /** Active file slice */
  activeFile: DataSlice<ActiveFileSlice>;
}
