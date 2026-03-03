import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import { ThemedMonacoWithProvider } from '@principal-ade/industry-themed-monaco-editor';
import { FileText, X } from 'lucide-react';

import type {
  PanelComponentProps,
  FileEditorPanelActions,
  FileEditorPanelContext,
} from '../../types';

/**
 * Extended props for FileEditorPanel with optional prop-controlled mode
 */
export interface FileEditorPanelProps
  extends PanelComponentProps<FileEditorPanelActions, FileEditorPanelContext> {
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
}

const getLanguage = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    kt: 'kotlin',
    swift: 'swift',
    json: 'json',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    conf: 'ini',
    md: 'markdown',
    mdx: 'markdown',
  };
  return languageMap[ext] || 'plaintext';
};

/**
 * FileEditorPanelContent - Internal component that uses theme
 */
const FileEditorPanelContent: React.FC<FileEditorPanelProps> = ({
  context,
  actions,
  events,
  filePath: filePathProp,
  showCloseButton = false,
}) => {
  const { theme } = useTheme();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latestFilePathRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);

  // File editing is always available via actions
  const isEditable = Boolean(actions.writeFile);

  // Get active file from typed context
  const { activeFile, preferences } = context;

  // Get user preferences (vim mode, etc.)
  const vimMode = preferences?.data?.vimMode ?? false;

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    isDirtyRef.current = false;
    setIsDirty(false);
    setIsSaving(false);
    isSavingRef.current = false;
    setSaveError(null);
  }, [filePath]);

  // Prop-controlled mode: when filePath prop is provided, it takes precedence
  useEffect(() => {
    if (filePathProp) {
      console.log('[FileEditorPanel] Using prop-controlled file path:', filePathProp);
      setFilePath(filePathProp);
    }
  }, [filePathProp]);

  // Sync with active-file slice (only when not prop-controlled)
  useEffect(() => {
    if (!filePathProp && activeFile?.data?.path) {
      setFilePath(activeFile.data.path);
    }
  }, [filePathProp, activeFile?.data?.path]);

  // Listen for file:open events (only when not prop-controlled)
  useEffect(() => {
    if (filePathProp) {
      // In prop-controlled mode, ignore events
      return undefined;
    }

    const unsubscribe = events.on('file:open', (event) => {
      const payload = event.payload as { path: string };
      if (payload?.path) {
        setFilePath(payload.path);
      }
    });
    return unsubscribe;
  }, [events, filePathProp]);

  const loadFile = useCallback(async () => {
    if (!filePath) {
      latestFilePathRef.current = null;
      setFileContent('');
      setEditorContent('');
      setIsDirty(false);
      setIsSaving(false);
      setSaveError(null);
      return;
    }

    latestFilePathRef.current = filePath;
    setIsLoading(true);
    setError(null);

    try {
      const content = await actions.readFile(filePath);

      if (latestFilePathRef.current !== filePath) {
        return;
      }

      setFileContent(content);
      setSaveError(null);
      if (!isDirtyRef.current) {
        setEditorContent(content);
        setIsDirty(false);
      }
    } catch (err) {
      console.error('Error loading file:', err);
      if (latestFilePathRef.current === filePath) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
        setFileContent('');
      }
    } finally {
      if (latestFilePathRef.current === filePath) {
        setIsLoading(false);
      }
    }
  }, [filePath, actions]);

  useEffect(() => {
    loadFile();
  }, [loadFile]);

  const handleEditorChange = useCallback(
    (value?: string) => {
      const nextValue = value ?? '';
      setEditorContent(nextValue);
      setIsDirty(nextValue !== fileContent);
      if (saveError) {
        setSaveError(null);
      }
    },
    [fileContent, saveError]
  );

  const handleEditorSave = useCallback(
    async (value?: string) => {
      if (!filePath || !actions.writeFile) {
        return;
      }

      const contentToSave = value ?? editorContent;

      if (!isDirty && contentToSave === fileContent) {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);
      setSaveError(null);

      try {
        await actions.writeFile(filePath, contentToSave);

        if (latestFilePathRef.current === filePath) {
          setFileContent(contentToSave);
          setEditorContent(contentToSave);
          setIsDirty(false);

          // Emit file:save event
          events.emit({
            type: 'file:save',
            source: 'industry-theme.file-editor',
            timestamp: Date.now(),
            payload: { path: filePath },
          });
        }
      } catch (err) {
        if (latestFilePathRef.current === filePath) {
          setSaveError(
            err instanceof Error ? err.message : 'Failed to save file'
          );
        }
      } finally {
        if (latestFilePathRef.current === filePath) {
          setIsSaving(false);
        }
        isSavingRef.current = false;
      }
    },
    [editorContent, fileContent, filePath, isDirty, actions, events]
  );

  const handleClose = useCallback(() => {
    events.emit({
      type: 'file:close',
      source: 'industry-theme.file-editor',
      timestamp: Date.now(),
      payload: { path: filePath },
    });
    setFilePath(null);
  }, [events, filePath]);

  const fileName = filePath?.split('/').pop() || filePath || '';
  const language = filePath ? getLanguage(filePath) : 'plaintext';

  if (!filePath) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: theme.colors.textSecondary,
          padding: '20px',
          textAlign: 'center',
          fontFamily: theme.fonts.body,
        }}
      >
        <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <div
          style={{
            fontSize: theme.fontSizes[3],
            fontWeight: 600,
            marginBottom: '12px',
            color: theme.colors.text,
          }}
        >
          File Editor
        </div>
        <div style={{ fontSize: theme.fontSizes[1] }}>
          Select a file to view or edit
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.colors.background,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '40px',
          padding: '0 12px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.colors.backgroundSecondary,
          fontFamily: theme.fonts.body,
          flexShrink: 0,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: 1,
            minWidth: 0,
          }}
        >
          <FileText
            size={16}
            style={{ color: theme.colors.primary, flexShrink: 0 }}
          />
          <div
            style={{
              fontSize: theme.fontSizes[2],
              fontWeight: 600,
              color: theme.colors.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={filePath}
          >
            {fileName}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {isEditable && (
            <>
              {saveError ? (
                <span
                  style={{
                    color: theme.colors.error,
                    fontSize: theme.fontSizes[0],
                  }}
                >
                  Save failed: {saveError}
                </span>
              ) : isSaving ? (
                <span
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSizes[0],
                  }}
                >
                  Saving...
                </span>
              ) : isDirty ? (
                <span
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.fontSizes[0],
                  }}
                >
                  Unsaved changes
                </span>
              ) : (
                <span
                  style={{
                    color: theme.colors.textSecondary,
                    fontSize: theme.fontSizes[0],
                  }}
                >
                  Saved
                </span>
              )}
              <button
                onClick={() => void handleEditorSave()}
                disabled={!isDirty || isSaving}
                style={{
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: theme.fontSizes[0],
                  cursor: !isDirty || isSaving ? 'not-allowed' : 'pointer',
                  opacity: !isDirty || isSaving ? 0.6 : 1,
                  transition: 'opacity 0.2s ease',
                }}
              >
                Save
              </button>
            </>
          )}
          {filePath && showCloseButton && (
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme.colors.backgroundSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isLoading ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.textSecondary,
              fontFamily: theme.fonts.body,
            }}
          >
            Loading file...
          </div>
        ) : error ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.error,
              padding: '20px',
              textAlign: 'center',
              fontFamily: theme.fonts.body,
            }}
          >
            Error: {error}
          </div>
        ) : (
          <ThemedMonacoWithProvider
            value={editorContent}
            language={language}
            vimMode={isEditable ? vimMode : false}
            options={{
              readOnly: !isEditable,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: theme.fontSizes[2],
              automaticLayout: true,
              folding: true,
              renderWhitespace: 'selection',
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                useShadows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            height="100%"
            onChange={isEditable ? handleEditorChange : undefined}
            onSave={isEditable ? handleEditorSave : undefined}
          />
        )}
      </div>
    </div>
  );
};

/**
 * FileEditorPanel - Monaco-based code editor with vim mode support.
 *
 * This panel provides:
 * - Syntax highlighting for many languages
 * - File editing with save support
 * - Dirty state tracking
 * - Integration with panel framework events
 */
export const FileEditorPanel: React.FC<FileEditorPanelProps> = (props) => {
  return <FileEditorPanelContent {...props} />;
};

export const FileEditorPanelPreview: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        padding: '12px',
        fontSize: theme.fontSizes[0],
        color: theme.colors.text,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontFamily: theme.fonts.monospace,
      }}
    >
      <div>
        <span style={{ color: '#c678dd' }}>export</span>{' '}
        <span style={{ color: '#61afef' }}>function</span>{' '}
        <span style={{ color: '#e5c07b' }}>hello</span>() {'{'}
      </div>
      <div style={{ paddingLeft: '12px' }}>
        console.<span style={{ color: '#61afef' }}>log</span>(
        <span style={{ color: '#98c379' }}>'Hello'</span>);
      </div>
      <div>{'}'}</div>
    </div>
  );
};
