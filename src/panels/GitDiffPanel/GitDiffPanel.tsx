import React, { useEffect, useMemo, useState } from 'react';
import { ThemeProvider, useTheme } from '@principal-ade/industry-theme';
import { ThemedMonacoDiffEditor } from '@principal-ade/industry-themed-monaco-editor';
import { GitCommit, X } from 'lucide-react';

import type { PanelComponentProps, GitChangeStatus } from '../../types';

const statusMeta: Record<
  GitChangeStatus,
  { label: string; description: string }
> = {
  staged: {
    label: 'Staged change',
    description: 'Comparing staged changes against the last commit',
  },
  unstaged: {
    label: 'Unstaged change',
    description: 'Comparing working tree changes against the last commit',
  },
  untracked: {
    label: 'Untracked file',
    description: 'New file compared against an empty baseline',
  },
  deleted: {
    label: 'Deleted file',
    description: 'Showing the last committed contents of the deleted file',
  },
};

const languageFromPath = (filePath: string | null): string => {
  if (!filePath) {
    return 'plaintext';
  }

  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    conf: 'ini',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    md: 'markdown',
    mdx: 'markdown',
    sql: 'sql',
  };

  return languageMap[ext] ?? 'plaintext';
};

interface GitDiffPayload {
  path: string;
  status?: GitChangeStatus;
  original?: string;
  modified?: string;
}

/**
 * GitDiffPanelContent - Internal component that uses theme
 */
const GitDiffPanelContent: React.FC<PanelComponentProps> = ({
  context,
  actions: _actions,
  events,
}) => {
  const { theme } = useTheme();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [status, setStatus] = useState<GitChangeStatus>('unstaged');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const language = useMemo(() => languageFromPath(filePath), [filePath]);

  // Get file system adapter from context
  const fileSystem = context.adapters?.fileSystem;

  // Listen for git:diff events
  useEffect(() => {
    const unsubscribe = events.on('git:diff', (event) => {
      const payload = event.payload as GitDiffPayload;
      if (payload?.path) {
        setFilePath(payload.path);
        setStatus(payload.status || 'unstaged');
        // If content is provided directly, use it
        if (payload.original !== undefined || payload.modified !== undefined) {
          setOriginalContent(payload.original ?? '');
          setModifiedContent(payload.modified ?? '');
          setIsLoading(false);
          setError(null);
        }
      }
    });
    return unsubscribe;
  }, [events]);

  // Load diff content when file path changes
  useEffect(() => {
    let isActive = true;

    const loadDiff = async () => {
      if (!filePath) {
        setOriginalContent('');
        setModifiedContent('');
        setIsLoading(false);
        setError(null);
        return;
      }

      // If we don't have a file system adapter, we can't load content
      if (!fileSystem?.readFile) {
        // Content should be provided via events
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // For now, read the current file content as "modified"
        // The "original" would need to come from git or be provided via events
        const modified = await fileSystem.readFile(filePath);

        if (!isActive) return;

        setModifiedContent(modified ?? '');
        // Original content should be provided via git:diff event payload
        // or we leave it empty for new files
        if (status === 'untracked') {
          setOriginalContent('');
        }
      } catch (err) {
        if (!isActive) return;

        console.error('Failed to load git diff:', err);
        setError(
          err instanceof Error
            ? `Failed to load diff: ${err.message}`
            : 'Failed to load diff'
        );
        setOriginalContent('');
        setModifiedContent('');
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadDiff();

    return () => {
      isActive = false;
    };
  }, [filePath, status, fileSystem]);

  const handleClose = () => {
    events.emit({
      type: 'git:diff:close',
      source: 'industry-theme.git-diff',
      timestamp: Date.now(),
      payload: { path: filePath },
    });
    setFilePath(null);
  };

  const statusInfo = status ? statusMeta[status] : null;
  const statusColor = useMemo(() => {
    if (!status) return theme.colors.textSecondary;

    switch (status) {
      case 'staged':
        return theme.colors.success || '#10b981';
      case 'unstaged':
        return theme.colors.warning || '#f59e0b';
      case 'untracked':
        return theme.colors.info || theme.colors.primary || '#3b82f6';
      case 'deleted':
        return theme.colors.error || '#ef4444';
      default:
        return theme.colors.textSecondary;
    }
  }, [status, theme.colors]);

  if (!filePath) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textSecondary,
          backgroundColor: theme.colors.backgroundSecondary,
          fontFamily: theme.fonts.body,
        }}
      >
        Select a file from Git Changes to view its diff.
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
      <div
        style={{
          height: '40px',
          padding: '0 12px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
          <GitCommit
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
            {filePath?.split('/').pop() || filePath}
          </div>
          {statusInfo && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: theme.fontSizes[0],
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: `${statusColor}20`,
                color: statusColor,
                border: `1px solid ${statusColor}60`,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {statusInfo.label}
            </span>
          )}
        </div>
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
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              theme.colors.backgroundTertiary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X size={16} />
        </button>
      </div>
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
            Loading diff...
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
            {error}
          </div>
        ) : (
          <ThemedMonacoDiffEditor
            theme={theme}
            original={originalContent}
            modified={modifiedContent}
            language={language}
            height="100%"
            options={{
              renderSideBySide: true,
              readOnly: true,
              minimap: { enabled: false },
              automaticLayout: true,
              renderIndicators: true,
              renderMarginRevertIcon: true,
              ignoreTrimWhitespace: false,
              diffAlgorithm: 'advanced',
              scrollbar: {
                useShadows: false,
                vertical: 'auto',
                horizontal: 'auto',
              },
            }}
            loadingComponent={
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.colors.textSecondary,
                }}
              >
                Preparing diff editor...
              </div>
            }
          />
        )}
      </div>
    </div>
  );
};

/**
 * GitDiffPanel - Side-by-side git diff viewer.
 *
 * This panel shows:
 * - Side-by-side comparison of original vs modified content
 * - Status indicators for staged/unstaged/untracked/deleted files
 * - Syntax highlighting based on file type
 */
export const GitDiffPanel: React.FC<PanelComponentProps> = (props) => {
  return (
    <ThemeProvider>
      <GitDiffPanelContent {...props} />
    </ThemeProvider>
  );
};

export const GitDiffPanelPreview: React.FC = () => {
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
      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <span style={{ color: theme.colors.textSecondary }}>@@ 12,5 @@</span>
      </div>
      <div style={{ color: '#ef4444' }}>- const count = oldValue;</div>
      <div style={{ color: '#22c55e' }}>+ const count = newValue;</div>
      <div style={{ color: theme.colors.textSecondary }}> return count;</div>
    </div>
  );
};
