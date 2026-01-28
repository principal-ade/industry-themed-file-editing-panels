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
} from '@principal-ai/mdx-editor';
import '@principal-ai/mdx-editor/style.css';
import './MDXEditorPanel.css';
import { useTheme } from '@principal-ade/industry-theme';
import { FileText } from 'lucide-react';

import type { PanelComponentProps, ActiveFileSlice, GitChangeStatus } from '../../types';

/**
 * Extended props for MDXEditorPanel with optional prop-controlled mode
 */
export interface MDXEditorPanelProps extends PanelComponentProps {
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
}

/**
 * MDXEditorPanelContent - Internal component that uses theme
 */
const MDXEditorPanelContent: React.FC<MDXEditorPanelProps> = ({
  context,
  actions: _actions,
  events,
  filePath: filePathProp,
  showCloseButton = true,
  gitStatus: gitStatusProp,
  isDirty: isDirtyProp,
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

  // Get file system adapter from context
  const fileSystem = context.adapters?.fileSystem;
  const isEditable = Boolean(fileSystem?.writeFile);

  // Get active file from context slice
  const activeFileSlice = context.getSlice<ActiveFileSlice>('active-file');

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
      }),
      frontmatterPlugin(),
      diffSourcePlugin({
        viewMode: parseError ? 'source' : 'rich-text',
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
    [parseError, _isDirty, gitStatus, theme]
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
      const path = activeFileSlice?.data?.path;
      if (path && (path.endsWith('.md') || path.endsWith('.mdx'))) {
        setFilePath(path);
      }
    }
  }, [filePathProp, activeFileSlice?.data?.path]);

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

      if (filePath && fileSystem?.writeFile) {
        try {
          await fileSystem.writeFile(filePath, contentToSave);

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
    [markdown, filePath, fileSystem, events, gitStatus, isDirtyProp, gitStatusProp]
  );

  // Load file content when filePath changes
  useEffect(() => {
    const loadFileContent = async () => {
      if (!filePath || !fileSystem?.readFile) {
        setMarkdown('');
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const content = await fileSystem.readFile(filePath);

        if (content !== null) {
          setMarkdown(content);
          setParseError(null);
          if (isDirtyProp === undefined) {
            setInternalIsDirty(false);
          }
        } else {
          throw new Error('Failed to read file');
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
  }, [filePath, fileSystem, isDirtyProp]);

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
      style={{
        height: '100%',
        width: '100%',
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        overflow: 'auto',
      }}
    >
      <MDXEditor
        key={filePath || 'default'}
        markdown={safeMarkdown}
        onChange={handleChange}
        readOnly={!isEditable}
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
