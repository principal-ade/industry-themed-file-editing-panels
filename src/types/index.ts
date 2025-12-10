/**
 * Panel Extension Type Definitions
 *
 * Re-exports core types from @principal-ade/panel-framework-core
 */

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
  getOriginal: (path: string, status: GitChangeStatus) => Promise<string | null>;
  /** Get the modified (working tree) content */
  getModified: (path: string, status: GitChangeStatus) => Promise<string | null>;
}

/**
 * File source information for determining read/write capabilities
 */
export interface FileSource {
  type: 'local' | 'remote';
  location?: string;
}
