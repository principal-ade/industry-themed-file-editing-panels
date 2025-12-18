/**
 * @industry-theme/file-editing-panels
 *
 * Git diff view and editor panels for dev workspaces.
 * These panels are decoupled from Electron and use provider interfaces
 * for file system and git operations.
 */

// Panel Components
export { GitDiffPanel, GitDiffPanelPreview } from './panels/GitDiffPanel';
export {
  FileEditorPanel,
  FileEditorPanelPreview,
} from './panels/FileEditorPanel';
export { MDXEditorPanel, MDXEditorPanelPreview } from './panels/MDXEditorPanel';

// Panel Props Types
export type { GitDiffPanelProps } from './panels/GitDiffPanel';
export type { FileEditorPanelProps } from './panels/FileEditorPanel';
export type { MDXEditorPanelProps } from './panels/MDXEditorPanel';

// Provider Interfaces
export type {
  GitChangeStatus,
  FileContentProvider,
  DiffContentProvider,
  FileSource,
} from './types';

// Re-export framework types for convenience
export type {
  PanelDefinition,
  PanelContextValue,
  PanelMetadata,
  PanelComponentProps,
} from './types';
