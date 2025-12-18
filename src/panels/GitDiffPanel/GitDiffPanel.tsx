import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import { ThemedMonacoDiffEditor } from '@principal-ade/industry-themed-monaco-editor';
import { GitCommit, X } from 'lucide-react';

import type { GitChangeStatus, DiffContentProvider } from '../../types';

export interface GitDiffPanelProps {
  /** Relative path to the file being diffed */
  filePath: string | null;
  /** Git change status */
  status?: GitChangeStatus;
  /** Provider for fetching diff content */
  diffProvider: DiffContentProvider;
  /** Called when close button is clicked */
  onClose?: () => void;
}

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

export const GitDiffPanel: React.FC<GitDiffPanelProps> = ({
  filePath,
  status = 'unstaged',
  diffProvider,
  onClose,
}) => {
  const { theme } = useTheme();
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const language = useMemo(() => languageFromPath(filePath), [filePath]);

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

      setIsLoading(true);
      setError(null);

      try {
        const [original, modified] = await Promise.all([
          diffProvider.getOriginal(filePath, status),
          diffProvider.getModified(filePath, status),
        ]);

        if (!isActive) return;

        setOriginalContent(original ?? '');
        setModifiedContent(modified ?? '');
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
  }, [filePath, status, diffProvider]);

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
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.colors.backgroundSecondary,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: theme.colors.backgroundTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.colors.text,
              }}
            >
              <GitCommit size={18} />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: theme.fontSizes[2],
                  fontWeight: 600,
                  color: theme.colors.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={filePath}
              >
                {filePath}
              </div>
              {statusInfo && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: theme.fontSizes[0],
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: `${statusColor}20`,
                      color: statusColor,
                      border: `1px solid ${statusColor}60`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusInfo.label}
                  </span>
                  <span
                    style={{
                      fontSize: theme.fontSizes[0],
                      color: theme.colors.textSecondary,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {statusInfo.description}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
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
                theme.colors.backgroundTertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={16} />
          </button>
        )}
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
