# @industry-theme/file-editing-panels

Git diff view and file editor panels for dev workspaces. Decoupled from Electron for use in any React application.

## Installation

```bash
npm install @industry-theme/file-editing-panels
```

## Panels

### GitDiffPanel

Side-by-side git diff viewer with syntax highlighting.

```tsx
import {
  GitDiffPanel,
  DiffContentProvider,
} from '@industry-theme/file-editing-panels';

const diffProvider: DiffContentProvider = {
  getOriginal: async (path, status) => {
    // Return original file content (e.g., from git show HEAD:path)
    return await gitService.show(`HEAD:${path}`);
  },
  getModified: async (path, status) => {
    // Return modified file content (e.g., working tree)
    return await fs.readFile(path);
  },
};

<GitDiffPanel
  filePath="src/App.tsx"
  status="unstaged" // 'staged' | 'unstaged' | 'untracked' | 'deleted'
  diffProvider={diffProvider}
  onClose={() => {}}
/>;
```

### FileEditorPanel

Code editor with syntax highlighting, save support, and optional vim mode.

```tsx
import {
  FileEditorPanel,
  FileContentProvider,
} from '@industry-theme/file-editing-panels';

const contentProvider: FileContentProvider = {
  readFile: async (path) => await fs.readFile(path, 'utf-8'),
  writeFile: async (path, content) => await fs.writeFile(path, content),
  watchFile: (path, callback) => {
    const watcher = fs.watch(path, callback);
    return () => watcher.close();
  },
};

<FileEditorPanel
  filePath="/src/App.tsx"
  source={{ type: 'local', location: '/path/to/repo' }}
  contentProvider={contentProvider}
  vimMode={false}
  readOnly={false}
  onClose={() => {}}
/>;
```

### MDXEditorPanel

Rich markdown/MDX editor with toolbar and live preview.

```tsx
import {
  MDXEditorPanel,
  FileContentProvider,
} from '@industry-theme/file-editing-panels';

<MDXEditorPanel
  filePath="/docs/README.md"
  contentProvider={contentProvider}
  readOnly={false}
  onSave={(content) => console.log('Saved:', content)}
  onImageUpload={async (file) => {
    // Upload image and return URL
    return await uploadImage(file);
  }}
/>;
```

## Provider Interfaces

### FileContentProvider

```typescript
interface FileContentProvider {
  readFile: (path: string) => Promise<string | null>;
  writeFile?: (path: string, content: string) => Promise<void>;
  watchFile?: (path: string, callback: () => void) => () => void;
}
```

### DiffContentProvider

```typescript
interface DiffContentProvider {
  getOriginal: (
    path: string,
    status: GitChangeStatus
  ) => Promise<string | null>;
  getModified: (
    path: string,
    status: GitChangeStatus
  ) => Promise<string | null>;
}
```

### GitChangeStatus

```typescript
type GitChangeStatus = 'staged' | 'unstaged' | 'untracked' | 'deleted';
```

## Theming

All panels use `@principal-ade/industry-theme`. Wrap your app in a `ThemeProvider`:

```tsx
import { ThemeProvider } from '@principal-ade/industry-theme';

<ThemeProvider>
  <GitDiffPanel {...props} />
</ThemeProvider>;
```

## Dependencies

### Peer Dependencies

- `react` >= 19.0.0
- `react-dom` >= 19.0.0

### Bundled Dependencies

- `@principal-ade/industry-theme`
- `@principal-ade/industry-themed-monaco-editor`
- `@principal-ade/industry-themed-mdx-editor`
- `@mdxeditor/editor`
- `lucide-react`

## Development

```bash
# Install dependencies
bun install

# Start Storybook
bun run storybook

# Build
bun run build

# Typecheck
bun run typecheck
```

## License

MIT
