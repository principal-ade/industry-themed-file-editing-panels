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
} from '@mdxeditor/editor';
import { ThemedMDXEditorWithProvider } from '@principal-ade/industry-themed-mdx-editor';
import { ThemeProvider, useTheme } from '@principal-ade/industry-theme';
import { FileText } from 'lucide-react';

import type { PanelComponentProps, ActiveFileSlice } from '../../types';

/**
 * MDXEditorPanelContent - Internal component that uses theme
 */
const MDXEditorPanelContent: React.FC<PanelComponentProps> = ({
  context,
  actions: _actions,
  events,
}) => {
  const { theme } = useTheme();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [_isDirty, setIsDirty] = useState<boolean>(false);

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
      }),
    ],
    [parseError]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync with active-file slice (only for markdown files)
  useEffect(() => {
    const path = activeFileSlice?.data?.path;
    if (path && (path.endsWith('.md') || path.endsWith('.mdx'))) {
      setFilePath(path);
    }
  }, [activeFileSlice?.data?.path]);

  // Listen for file:open events (only handle markdown files)
  useEffect(() => {
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
  }, [events]);

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
          setIsDirty(false);
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
  }, [filePath, fileSystem]);

  const handleChange = useCallback((value: string) => {
    setMarkdown(value);
    setParseError(null);
  }, []);

  const handleSave = useCallback(
    async (content?: string) => {
      const contentToSave = content || markdown;

      if (filePath && fileSystem?.writeFile) {
        try {
          await fileSystem.writeFile(filePath, contentToSave);
          setIsDirty(false);

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
    [markdown, filePath, fileSystem, events]
  );

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
      style={{
        height: '100%',
        width: '100%',
      }}
    >
      <ThemedMDXEditorWithProvider
        key={filePath || 'default'}
        markdown={safeMarkdown}
        onSave={async (content) => {
          await handleSave(content);
        }}
        onChange={handleChange}
        onDirtyChange={setIsDirty}
        readOnly={!isEditable}
        filePath={filePath || undefined}
        enableSaveShortcut={isEditable}
        hideStatusBar={false}
        documentPadding={{ left: 32, right: 32, top: 0, bottom: 32 }}
        onError={(error) => {
          console.error('MDXEditor parsing error:', error);
          setTimeout(() => {
            if (error && typeof error === 'object' && 'message' in error) {
              setParseError(String(error.message));
            } else {
              setParseError('Markdown parsing error');
            }
          }, 0);
        }}
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
export const MDXEditorPanel: React.FC<PanelComponentProps> = (props) => {
  return (
    <ThemeProvider>
      <MDXEditorPanelContent {...props} />
    </ThemeProvider>
  );
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
