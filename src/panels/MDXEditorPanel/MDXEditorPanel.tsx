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
import { useTheme } from '@principal-ade/industry-theme';
import { FileText } from 'lucide-react';

import type { FileContentProvider } from '../../types';

export interface MDXEditorPanelProps {
  /** Path to the markdown file */
  filePath?: string | null;
  /** Initial content if no file is loaded */
  initialContent?: string;
  /** Provider for file operations */
  contentProvider?: FileContentProvider;
  /** Called when content is saved */
  onSave?: (content: string) => void;
  /** Force read-only mode */
  readOnly?: boolean;
  /** Image upload handler */
  onImageUpload?: (file: File) => Promise<string>;
}

export const MDXEditorPanel: React.FC<MDXEditorPanelProps> = ({
  filePath,
  initialContent = '# Welcome to MDXEditor\n\nStart editing your markdown content here...',
  contentProvider,
  onSave,
  readOnly = false,
  onImageUpload,
}) => {
  const { theme } = useTheme();
  const [markdown, setMarkdown] = useState(initialContent);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

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
        imageUploadHandler: onImageUpload ?? (async (file) => {
          console.log('Image upload not configured:', file.name);
          return '/placeholder-image.png';
        }),
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
    [parseError, onImageUpload]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load file content if filePath is provided
  useEffect(() => {
    const loadFileContent = async () => {
      if (!filePath || !contentProvider) {
        setMarkdown(initialContent);
        setCurrentFilePath(null);
        return;
      }

      if (filePath === currentFilePath) {
        return;
      }

      // Auto-save current file before loading new one
      if (currentFilePath && isDirty && contentProvider.writeFile) {
        try {
          await contentProvider.writeFile(currentFilePath, markdown);
          console.log('Auto-saved before loading new file:', currentFilePath);
        } catch (error) {
          console.error('Failed to auto-save before loading new file:', error);
        }
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const content = await contentProvider.readFile(filePath);

        if (content !== null) {
          setMarkdown(content);
          setCurrentFilePath(filePath);
          setParseError(null);
          setIsDirty(false);
        } else {
          throw new Error('Failed to read file');
        }
      } catch (error) {
        console.error('Error loading file:', error);
        setLoadError(`Failed to load file: ${filePath}`);
        setMarkdown(initialContent);
        setParseError(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadFileContent();
  }, [filePath, contentProvider, initialContent, currentFilePath, isDirty, markdown]);

  // Auto-save on component unmount
  useEffect(() => {
    return () => {
      if (currentFilePath && isDirty && contentProvider?.writeFile) {
        contentProvider.writeFile(currentFilePath, markdown)
          .then(() => {
            console.log('Auto-saved on unmount:', currentFilePath);
          })
          .catch((error) => {
            console.error('Failed to auto-save on unmount:', error);
          });
      }
    };
  }, [currentFilePath, isDirty, markdown, contentProvider]);

  const handleChange = useCallback((value: string) => {
    setMarkdown(value);
    setParseError(null);
  }, []);

  const handleSave = useCallback(
    async (content?: string) => {
      const contentToSave = content || markdown;

      if (onSave) {
        onSave(contentToSave);
      }

      if (currentFilePath && contentProvider?.writeFile) {
        try {
          await contentProvider.writeFile(currentFilePath, contentToSave);
          console.log('File saved successfully:', currentFilePath);
          setIsDirty(false);
        } catch (error) {
          console.error('Error saving file:', error);
        }
      }
    },
    [markdown, onSave, currentFilePath, contentProvider]
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
        }}
      >
        <div style={{ marginBottom: '10px' }}>Warning</div>
        <div>{loadError}</div>
      </div>
    );
  }

  if (!filePath && !initialContent) {
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
        key={currentFilePath || 'default'}
        markdown={safeMarkdown}
        onSave={async (content) => {
          await handleSave(content);
        }}
        onChange={handleChange}
        onDirtyChange={setIsDirty}
        readOnly={readOnly}
        filePath={currentFilePath || undefined}
        enableSaveShortcut={!readOnly}
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
