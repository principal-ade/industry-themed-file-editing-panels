import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@principal-ade/industry-theme';
import { FileDiff } from '@pierre/diffs/react';
import { parsePatchFiles } from '@pierre/diffs';
import type { FileDiffMetadata } from '@pierre/diffs';
import { createPatch } from 'diff';
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

/**
 * Generate unified diff format from original and modified content
 */
function generateUnifiedDiff({
  filePath,
  originalContent,
  modifiedContent,
  status,
}: {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  status: GitChangeStatus;
}): string {
  // Use the full path for better compatibility with Pierre's parser
  let patch: string;

  if (status === 'untracked') {
    patch = createPatch(filePath, '', modifiedContent, '', '');
  } else if (status === 'deleted') {
    patch = createPatch(filePath, originalContent, '', '', '');
  } else {
    patch = createPatch(filePath, originalContent, modifiedContent, '', '');
  }

  // Convert index-style diff to git-style diff format that Pierre expects
  // Replace "Index: filename" header with git-style "diff --git" header
  patch = patch.replace(/^Index: (.+)$/m, 'diff --git a/$1 b/$1');

  // Update the --- and +++ lines to use a/ and b/ prefixes
  patch = patch.replace(/^--- (.+)\t.*$/m, '--- a/$1');
  patch = patch.replace(/^\+\+\+ (.+)\t.*$/m, '+++ b/$1');

  // Remove the equals line
  patch = patch.replace(/^={67}$/m, '');

  return patch;
}

/**
 * Create FileDiffMetadata from original and modified strings
 */
function createFileDiffMetadata(
  filePath: string,
  originalContent: string,
  modifiedContent: string,
  status: GitChangeStatus
): FileDiffMetadata {
  const unifiedDiff = generateUnifiedDiff({
    filePath,
    originalContent,
    modifiedContent,
    status,
  });

  const parsed = parsePatchFiles(unifiedDiff);

  if (!parsed || parsed.length === 0 || !parsed[0].files || parsed[0].files.length === 0) {
    throw new Error('Failed to parse diff');
  }

  return parsed[0].files[0];
}

interface GitDiffPayload {
  path: string;
  status?: GitChangeStatus;
  original?: string;
  modified?: string;
}

/**
 * Extended props for GitDiffPanel with optional prop-controlled mode
 */
export interface GitDiffPanelProps extends PanelComponentProps {
  /**
   * Optional file path to display diff for.
   * If provided, this takes precedence over event-based selection.
   * This allows the host to control panel state via props instead of events.
   */
  filePath?: string | null;
  /**
   * Optional git status for the file.
   * Used together with filePath in prop-controlled mode.
   */
  gitStatus?: GitChangeStatus;
  /**
   * Whether to show the close button in the panel header.
   * Set to false when using in tabs (where the tab has its own close button).
   * Defaults to true.
   */
  showCloseButton?: boolean;
}

/**
 * GitDiffPanelContent - Internal component that uses theme
 */
const GitDiffPanelContent: React.FC<GitDiffPanelProps> = ({
  context,
  actions: _actions,
  events,
  filePath: filePathProp,
  gitStatus: gitStatusProp,
  showCloseButton = false,
}) => {
  const { theme } = useTheme();
  const [filePath, setFilePath] = useState<string | null>(null);
  const [status, setStatus] = useState<GitChangeStatus>('unstaged');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffStyle, setDiffStyle] = useState<'split' | 'unified'>('unified');
  const [contentProvidedExternally, setContentProvidedExternally] = useState(false);

  const language = useMemo(() => languageFromPath(filePath), [filePath]);

  // Get file system adapter from context
  const fileSystem = context.adapters?.fileSystem;

  // Prop-controlled mode: when filePath prop is provided, it takes precedence
  useEffect(() => {
    if (filePathProp) {
      console.log('[GitDiffPanel] Using prop-controlled file path:', filePathProp);
      setFilePath(filePathProp);
      setStatus(gitStatusProp || 'unstaged');
    }
  }, [filePathProp, gitStatusProp]);

  // Listen for git:diff events (only when not prop-controlled)
  useEffect(() => {
    if (filePathProp) {
      // In prop-controlled mode, ignore events
      return undefined;
    }

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
          setContentProvidedExternally(true);
        } else {
          setContentProvidedExternally(false);
        }
      }
    });
    return unsubscribe;
  }, [events, filePathProp]);

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

      // If content was provided externally (e.g., via events in Storybook), skip file loading
      if (contentProvidedExternally) {
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
        // Read the current file content as "modified"
        const modified = await fileSystem.readFile(filePath);

        if (!isActive) return;

        setModifiedContent(modified ?? '');

        // For untracked files, original content is empty
        if (status === 'untracked') {
          setOriginalContent('');
        } else {
          // For modified files, try to get the original content from git
          // Use getFileContentAtRevision if available (from the fileSystem adapter)
          // Type assertion is needed since this is an optional extension
          const fsWithGit = fileSystem as any;
          if (fsWithGit && typeof fsWithGit.getFileContentAtRevision === 'function') {
            try {
              const original = await fsWithGit.getFileContentAtRevision(filePath, 'HEAD');
              if (!isActive) return;
              setOriginalContent(original ?? '');
            } catch (gitError) {
              console.warn('[GitDiffPanel] Failed to get file from git, using empty original:', gitError);
              setOriginalContent('');
            }
          } else {
            console.warn('[GitDiffPanel] getFileContentAtRevision not available in fileSystem adapter');
            setOriginalContent('');
          }
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
  }, [filePath, status, fileSystem, contentProvidedExternally]);

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
        <div
          style={{
            display: 'flex',
            gap: '4px',
            marginLeft: '8px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setDiffStyle('unified')}
            style={{
              background: diffStyle === 'unified' ? theme.colors.primary : 'transparent',
              border: `1px solid ${theme.colors.border}`,
              padding: '4px 8px',
              cursor: 'pointer',
              color: diffStyle === 'unified' ? theme.colors.background : theme.colors.text,
              fontSize: theme.fontSizes[0],
              borderRadius: '4px 0 0 4px',
              fontFamily: theme.fonts.body,
              transition: 'all 0.2s',
            }}
            title="Unified view (stacked)"
          >
            Unified
          </button>
          <button
            onClick={() => setDiffStyle('split')}
            style={{
              background: diffStyle === 'split' ? theme.colors.primary : 'transparent',
              border: `1px solid ${theme.colors.border}`,
              padding: '4px 8px',
              cursor: 'pointer',
              color: diffStyle === 'split' ? theme.colors.background : theme.colors.text,
              fontSize: theme.fontSizes[0],
              borderRadius: '0 4px 4px 0',
              fontFamily: theme.fonts.body,
              transition: 'all 0.2s',
            }}
            title="Split view (side-by-side)"
          >
            Split
          </button>
        </div>
        {showCloseButton && (
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
        )}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
          (() => {
            // Handle empty files
            if (!originalContent && !modifiedContent) {
              return (
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
                  Empty file
                </div>
              );
            }

            try {
              const fileDiff = createFileDiffMetadata(
                filePath!,
                originalContent,
                modifiedContent,
                status
              );

              return (
                <div
                  style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <FileDiff
                    fileDiff={fileDiff}
                    options={{
                      diffStyle: diffStyle,
                    }}
                  />
                </div>
              );
            } catch (error) {
              return (
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
                  Failed to generate diff:{' '}
                  {error instanceof Error ? error.message : 'Unknown error'}
                </div>
              );
            }
          })()
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
export const GitDiffPanel: React.FC<GitDiffPanelProps> = (props) => {
  return <GitDiffPanelContent {...props} />;
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
