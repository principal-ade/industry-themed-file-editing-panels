import type { Meta, StoryObj } from '@storybook/react';
import { MDXEditorPanel } from './MDXEditorPanel';
import type { FileContentProvider } from '../../types';

// Mock markdown content
const mockReadmeContent = `# Project Documentation

Welcome to the project documentation. This guide will help you get started.

## Installation

\`\`\`bash
npm install @industry-theme/file-editing-panels
\`\`\`

## Quick Start

Here's a simple example:

\`\`\`typescript
import { MDXEditorPanel } from '@industry-theme/file-editing-panels';

function App() {
  return (
    <MDXEditorPanel
      filePath="/docs/README.md"
      contentProvider={myProvider}
    />
  );
}
\`\`\`

## Features

- **Rich editing** - Full WYSIWYG markdown editing
- **Code blocks** - Syntax highlighted code with language support
- **Tables** - Easy table creation and editing
- **Images** - Drag and drop image support

| Feature | Status |
|---------|--------|
| Headings | Done |
| Lists | Done |
| Code blocks | Done |

## Links

Check out our [website](https://example.com) for more info.

---

*Last updated: 2024*
`;

const mockBlogPostContent = `---
title: Getting Started with MDX
date: 2024-01-15
author: Developer
---

# Getting Started with MDX

MDX is a powerful format that lets you write JSX in your Markdown content.

## Why MDX?

1. **Component reusability** - Use React components in docs
2. **Interactive examples** - Live code examples
3. **Type safety** - Full TypeScript support

> MDX makes your documentation come alive!

## Code Example

\`\`\`tsx
function Greeting({ name }) {
  return <h1>Hello, {name}!</h1>;
}
\`\`\`

That's it! You're ready to start using MDX.
`;

const createMockContentProvider = (content: string): FileContentProvider => ({
  readFile: async () => content,
  writeFile: async (path, newContent) => {
    console.log('Saving MDX file:', path);
    console.log('Content length:', newContent.length);
  },
});

const meta: Meta<typeof MDXEditorPanel> = {
  title: 'Panels/MDXEditorPanel',
  component: MDXEditorPanel,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '700px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MDXEditorPanel>;

export const ReadmeFile: Story = {
  args: {
    filePath: '/docs/README.md',
    contentProvider: createMockContentProvider(mockReadmeContent),
    onSave: (content) => console.log('Saved:', content.substring(0, 100)),
  },
};

export const BlogPost: Story = {
  args: {
    filePath: '/blog/getting-started.mdx',
    contentProvider: createMockContentProvider(mockBlogPostContent),
    onSave: (content) => console.log('Saved:', content.substring(0, 100)),
  },
};

export const WithInitialContent: Story = {
  args: {
    initialContent: `# New Document

Start writing your content here...

## Section 1

Add your text.

## Section 2

More content goes here.
`,
    onSave: (content) => console.log('Saved:', content.substring(0, 100)),
  },
};

export const ReadOnlyMode: Story = {
  args: {
    filePath: '/docs/README.md',
    contentProvider: createMockContentProvider(mockReadmeContent),
    readOnly: true,
  },
};

export const NoFileSelected: Story = {
  args: {
    filePath: null,
  },
};

export const Loading: Story = {
  args: {
    filePath: '/docs/README.md',
    contentProvider: {
      readFile: () => new Promise<string | null>(() => {}), // Never resolves
    },
  },
};

export const ErrorState: Story = {
  args: {
    filePath: '/docs/missing.md',
    contentProvider: {
      readFile: async (): Promise<string | null> => {
        throw new globalThis.Error('File not found');
      },
    },
  },
};

export const WithImageUpload: Story = {
  args: {
    filePath: '/docs/README.md',
    contentProvider: createMockContentProvider(mockReadmeContent),
    onImageUpload: async (file) => {
      console.log('Uploading image:', file.name);
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return `https://placekitten.com/400/300?image=${Math.random()}`;
    },
  },
};
