import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  frontmatterPlugin,
  toolbarPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  BlockTypeSelect,
  DiffSourceToggleWrapper,
  MDXEditor,
  type MDXEditorMethods,
} from '@principal-ai/mdx-editor';
import '@principal-ai/mdx-editor/style.css';
import './MDXEditorPanel.css';
import './dark-editor.css';
import { useTheme } from '@principal-ade/industry-theme';
import { FileText } from 'lucide-react';
import { basicDark } from 'cm6-theme-basic-dark';
import {
  useVimCompartment,
  vimExtension,
  VimToggle,
  ViewModeController,
  type ViewMode,
} from './vim';
import { defaultFormatDroppedPath } from './pathDrop';

import type {
  PanelComponentProps,
  GitChangeStatus,
  MDXEditorPanelActions,
  MDXEditorPanelContext,
} from '../../types';

/**
 * Extended props for MDXEditorPanel with optional prop-controlled mode
 */
export interface MDXEditorPanelProps
  extends PanelComponentProps<MDXEditorPanelActions, MDXEditorPanelContext> {
  /**
   * Optional file path to display.
   * If provided, this takes precedence over event-based selection and context slices.
   * This allows the host to control panel state via props instead of events.
   */
  filePath?: string | null;
  /**
   * Whether to show the close button in the panel header.
   * Set to false when using in tabs (where the tab has its own close button).
   * Defaults to true.
   */
  showCloseButton?: boolean;
  /**
   * Optional git status for the current file.
   * Useful in tab scenarios where each tab tracks its own git status.
   * If not provided, the panel will listen for git:diff events.
   */
  gitStatus?: GitChangeStatus | null;
  /**
   * Optional dirty state for the current file.
   * If provided, overrides internal dirty tracking.
   * Useful when parent component manages save state.
   */
  isDirty?: boolean;
  /**
   * Whether vim keybindings are enabled on the CodeMirror surfaces
   * (source view + fenced code blocks).
   * If provided, the host controls vim state; otherwise the panel tracks it
   * internally (defaulting to {@link defaultVimEnabled}).
   */
  vimEnabled?: boolean;
  /**
   * Initial vim state when the panel is uncontrolled (i.e. `vimEnabled` is not
   * provided). Defaults to true.
   */
  defaultVimEnabled?: boolean;
  /**
   * Called whenever vim is toggled (by the user or, in controlled mode, when a
   * toggle is requested). Lets the host persist the user's preference.
   */
  onVimEnabledChange?: (enabled: boolean) => void;
  /**
   * Desired editor view mode (`rich-text` | `source` | `diff`).
   * When provided and different from the current mode, the panel switches the
   * editor to it. Also used as the initial mode on mount.
   */
  viewMode?: ViewMode;
  /**
   * Called on mount and whenever the editor's view mode changes, so the host
   * can track and persist the current mode.
   */
  onViewModeChange?: (mode: ViewMode) => void;
  /**
   * Enable inserting a dragged file path into the document at the cursor.
   * When something is dropped onto the editor (in rich-text mode) carrying a
   * `text/plain` (or `text/uri-list`) path, it is inserted as a markdown link
   * (`[fileName](path)` by default). Source/diff mode keeps CodeMirror's own
   * native text-drop behavior. Defaults to true.
   */
  enablePathDrop?: boolean;
  /**
   * Customize what a dropped path becomes. Receives the raw dropped string
   * (still shell-quoted if the drag source quoted it) and returns the markdown
   * to insert, or null to ignore the drop. Defaults to a markdown link whose
   * text is the file name and whose target is the full (relative) path.
   */
  formatDroppedPath?: (rawPath: string) => string | null;
}

/**
 * MDXEditorPanelContent - Internal component that uses theme
 */
const MDXEditorPanelContent: React.FC<MDXEditorPanelProps> = ({
  context,
  actions,
  events,
  filePath: filePathProp,
  showCloseButton = true,
  gitStatus: gitStatusProp,
  isDirty: isDirtyProp,
  vimEnabled: vimEnabledProp,
  defaultVimEnabled = true,
  onVimEnabledChange,
  viewMode: viewModeProp,
  onViewModeChange,
  enablePathDrop = true,
  formatDroppedPath = defaultFormatDroppedPath,
}) => {
  const { theme } = useTheme();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [internalIsDirty, setInternalIsDirty] = useState<boolean>(false);
  const [internalGitStatus, setInternalGitStatus] = useState<GitChangeStatus | null>(null);

  // Use prop values if provided, otherwise use internal state
  const _isDirty = isDirtyProp !== undefined ? isDirtyProp : internalIsDirty;
  const gitStatus = gitStatusProp !== undefined ? gitStatusProp : internalGitStatus;

  // Vim state: host-controlled when `vimEnabled` is provided, else internal.
  const [internalVimEnabled, setInternalVimEnabled] = useState<boolean>(defaultVimEnabled);
  const vimEnabled = vimEnabledProp !== undefined ? vimEnabledProp : internalVimEnabled;
  const handleVimEnabledChange = useCallback(
    (next: boolean) => {
      if (vimEnabledProp === undefined) {
        setInternalVimEnabled(next);
      }
      onVimEnabledChange?.(next);
    },
    [vimEnabledProp, onVimEnabledChange]
  );

  // File editing is always available via actions
  const isEditable = Boolean(actions.writeFile);

  // Stable compartment shared between the editor extensions and the toggle so
  // vim can be reconfigured live without remounting the editor.
  const vimCompartment = useVimCompartment();

  // Editor ref for imperative insertion (used by drag-to-insert).
  const editorRef = React.useRef<MDXEditorMethods>(null);

  // Track the live view mode so the drop handler can defer to CodeMirror's
  // native text-drop in source/diff mode and only insert markdown in rich-text.
  const [currentViewMode, setCurrentViewMode] = useState<ViewMode>(
    viewModeProp ?? 'rich-text'
  );
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setCurrentViewMode(mode);
      onViewModeChange?.(mode);
    },
    [onViewModeChange]
  );

  // Insert a dragged file path as markdown at the cursor (rich-text only).
  const handleEditorDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!enablePathDrop || !isEditable || currentViewMode !== 'rich-text') return;
      const types = e.dataTransfer.types;
      if (types.includes('text/plain') || types.includes('text/uri-list')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    [enablePathDrop, isEditable, currentViewMode]
  );
  const handleEditorDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!enablePathDrop || !isEditable || currentViewMode !== 'rich-text') return;
      const raw =
        e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list');
      if (!raw) return;
      const markdownToInsert = formatDroppedPath(raw);
      if (!markdownToInsert) return;
      e.preventDefault();
      e.stopPropagation();
      editorRef.current?.insertMarkdown(markdownToInsert);
    },
    [enablePathDrop, isEditable, currentViewMode, formatDroppedPath]
  );

  // Get active file from typed context
  const { activeFile } = context;

  // Memoize plugins array for performance
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin({
        imageUploadHandler: async (file) => {
          console.warn('Image upload not configured:', file.name);
          return '/placeholder-image.png';
        },
      }),
      tablePlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: 'javascript' }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          javascript: 'JavaScript',
          typescript: 'TypeScript',
          tsx: 'TypeScript (JSX)',
          jsx: 'JavaScript (JSX)',
          python: 'Python',
          java: 'Java',
          go: 'Go',
          rust: 'Rust',
          cpp: 'C++',
          c: 'C',
          css: 'CSS',
          html: 'HTML',
          json: 'JSON',
          yaml: 'YAML',
          markdown: 'Markdown',
          bash: 'Bash',
          shell: 'Shell',
          sql: 'SQL',
        },
        // Vim first so its keymap takes precedence over CodeMirror defaults.
        codeMirrorExtensions: [vimExtension(vimCompartment, vimEnabled), basicDark],
      }),
      frontmatterPlugin(),
      diffSourcePlugin({
        viewMode: viewModeProp ?? (parseError ? 'source' : 'rich-text'),
        codeMirrorExtensions: [vimExtension(vimCompartment, vimEnabled), basicDark],
      }),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <DiffSourceToggleWrapper>
              <UndoRedo />
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertThematicBreak />
              <ListsToggle />
            </DiffSourceToggleWrapper>
            {/* Headless: reports view-mode changes to the host and applies
                host-requested mode switches. Must live inside the editor realm. */}
            <ViewModeController desired={viewModeProp} onChange={handleViewModeChange} />
            {/* Toggles vim on the CodeMirror surfaces; hidden in rich-text. */}
            <VimToggle
              compartment={vimCompartment}
              enabled={vimEnabled}
              onChange={handleVimEnabledChange}
            />
          </>
        ),
        statusContent: () => (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {_isDirty && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#f59e0b'
                }} />
                <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>Unsaved</span>
              </div>
            )}
            {!_isDirty && gitStatus && gitStatus !== 'staged' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6'
                }} />
                <span style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                  {gitStatus === 'untracked' ? 'Untracked' : 'Uncommitted'}
                </span>
              </div>
            )}
          </div>
        ),
      }),
    ],
    [
      parseError,
      _isDirty,
      gitStatus,
      theme,
      vimCompartment,
      vimEnabled,
      handleVimEnabledChange,
      viewModeProp,
      handleViewModeChange,
    ]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prop-controlled mode: when filePath prop is provided, it takes precedence
  useEffect(() => {
    if (filePathProp) {
      console.log('[MDXEditorPanel] Using prop-controlled file path:', filePathProp);
      setFilePath(filePathProp);
    }
  }, [filePathProp]);

  // Sync with active-file slice (only for markdown files, only when not prop-controlled)
  useEffect(() => {
    if (!filePathProp) {
      const path = activeFile?.data?.path;
      if (path && (path.endsWith('.md') || path.endsWith('.mdx'))) {
        setFilePath(path);
      }
    }
  }, [filePathProp, activeFile?.data?.path]);

  // Listen for file:open events (only handle markdown files, only when not prop-controlled)
  useEffect(() => {
    if (filePathProp) {
      // In prop-controlled mode, ignore events
      return undefined;
    }

    const unsubscribe = events.on('file:open', (event) => {
      const payload = event.payload as { path: string };
      if (payload?.path) {
        const path = payload.path;
        if (path.endsWith('.md') || path.endsWith('.mdx')) {
          setFilePath(path);
        }
      }
    });
    return unsubscribe;
  }, [filePathProp, events]);

  // Listen for git:diff events to track git status (only if not prop-controlled)
  useEffect(() => {
    if (gitStatusProp !== undefined) {
      // Git status is controlled by props, ignore events
      return undefined;
    }

    const unsubscribe = events.on('git:diff', (event) => {
      const payload = event.payload as { path?: string; filePath?: string; status?: GitChangeStatus };
      const eventPath = payload?.path || payload?.filePath;
      if (eventPath === filePath && payload.status) {
        setInternalGitStatus(payload.status);
      }
    });
    return unsubscribe;
  }, [events, filePath, gitStatusProp]);

  const handleChange = useCallback((value: string) => {
    setMarkdown(value);
    if (isDirtyProp === undefined) {
      setInternalIsDirty(true);
    }
    setParseError(null);
  }, [isDirtyProp]);

  const handleSave = useCallback(
    async (content?: string) => {
      const contentToSave = content || markdown;

      if (filePath && actions.writeFile) {
        try {
          await actions.writeFile(filePath, contentToSave);

          // Update dirty state if not prop-controlled
          if (isDirtyProp === undefined) {
            setInternalIsDirty(false);
          }

          // Update git status if not prop-controlled
          // File is now saved but uncommitted (if it was previously untracked, keep that status)
          if (gitStatusProp === undefined && gitStatus !== 'untracked') {
            setInternalGitStatus('unstaged');
          }

          // Emit file:save event
          events.emit({
            type: 'file:save',
            source: 'industry-theme.mdx-editor',
            timestamp: Date.now(),
            payload: { path: filePath },
          });
        } catch (error) {
          console.error('Error saving file:', error);
        }
      }
    },
    [markdown, filePath, actions, events, gitStatus, isDirtyProp, gitStatusProp]
  );

  // Load file content when filePath changes
  useEffect(() => {
    const loadFileContent = async () => {
      if (!filePath) {
        setMarkdown('');
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const content = await actions.readFile(filePath);

        setMarkdown(content);
        setParseError(null);
        if (isDirtyProp === undefined) {
          setInternalIsDirty(false);
        }
      } catch (error) {
        console.error('Error loading file:', error);
        setLoadError(`Failed to load file: ${filePath}`);
        setMarkdown('');
        setParseError(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [filePath, actions, isDirtyProp]);

  // Handle keyboard shortcuts for save
  useEffect(() => {
    if (!isEditable) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditable, handleSave]);

  if (!isMounted) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: theme.colors.text,
          fontFamily: theme.fonts.body,
        }}
      >
        Loading editor...
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: theme.colors.text,
          fontFamily: theme.fonts.body,
        }}
      >
        Loading file...
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: theme.colors.error,
          padding: '20px',
          textAlign: 'center',
          fontFamily: theme.fonts.body,
        }}
      >
        <div style={{ marginBottom: '10px' }}>Warning</div>
        <div>{loadError}</div>
      </div>
    );
  }

  if (!filePath) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: theme.colors.textSecondary,
          padding: '40px',
          textAlign: 'center',
          fontFamily: theme.fonts.body,
        }}
      >
        <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: theme.fontSizes[3],
            fontWeight: 600,
            color: theme.colors.text,
          }}
        >
          No File Selected
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: theme.fontSizes[2],
            maxWidth: '400px',
          }}
        >
          Select a markdown file (.md or .mdx) to start editing
        </p>
      </div>
    );
  }

  const safeMarkdown =
    typeof markdown === 'string' ? markdown : String(markdown || '');

  const editorContent = (
    <div
      className="dark-theme mdx-editor-wrapper"
      onDragOverCapture={handleEditorDragOver}
      onDropCapture={handleEditorDrop}
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        overflow: 'auto',
        // Drive the MDXEditor surface color from the theme so the editor
        // background matches the wrapper (see --basePageBg in dark-editor.css)
        ['--panel-bg' as string]: theme.colors.background,
      } as React.CSSProperties}
    >
      <MDXEditor
        ref={editorRef}
        key={filePath || 'default'}
        markdown={safeMarkdown}
        onChange={handleChange}
        readOnly={!isEditable}
        className="dark-editor"
        contentEditableClassName="prose"
        plugins={plugins}
      />
    </div>
  );

  if (parseError) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: theme.colors.warning || '#f59e0b',
            color: theme.colors.background,
            fontSize: theme.fontSizes[2],
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Warning</span>
          <span>
            {parseError} - Switch to source mode using the toolbar button to
            edit the raw markdown.
          </span>
        </div>
        <div style={{ flex: 1 }}>{editorContent}</div>
      </div>
    );
  }

  return editorContent;
};

/**
 * MDXEditorPanel - Rich markdown/MDX editor.
 *
 * This panel provides:
 * - WYSIWYG markdown editing
 * - Code block support with syntax highlighting
 * - Image and table insertion
 * - Source mode for raw markdown editing
 */
export const MDXEditorPanel: React.FC<MDXEditorPanelProps> = (props) => {
  return <MDXEditorPanelContent {...props} />;
};

export const MDXEditorPanelPreview: React.FC = () => {
  const { theme } = useTheme();
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '4px',
        padding: '20px',
      }}
    >
      <FileText size={32} style={{ marginBottom: '12px', opacity: 0.6 }} />
      <div
        style={{
          fontSize: theme.fontSizes[2],
          fontWeight: 600,
          color: theme.colors.text,
          marginBottom: '4px',
        }}
      >
        MDX Editor
      </div>
      <div
        style={{
          fontSize: theme.fontSizes[1],
          color: theme.colors.textSecondary,
          textAlign: 'center',
        }}
      >
        Rich markdown editor with live preview
      </div>
    </div>
  );
};
