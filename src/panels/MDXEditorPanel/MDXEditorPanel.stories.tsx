import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef } from 'react';
import { MDXEditorPanel } from './MDXEditorPanel';
import {
  createMockContext,
  createMockActions,
  createMockEvents,
  emitFileOpen,
} from '../../mocks/panelContext';
import type { PanelComponentProps } from '../../types';

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
      context={context}
      actions={actions}
      events={events}
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

// Helper component that wraps MDXEditorPanel with mock context
const MDXEditorPanelWithMocks = ({
  initialFilePath,
  initialFiles,
}: {
  initialFilePath?: string;
  initialFiles?: Record<string, string>;
}) => {
  const context = createMockContext(undefined, initialFiles);
  const actions = createMockActions();
  const events = createMockEvents();
  const hasEmittedRef = useRef(false);

  useEffect(() => {
    if (initialFilePath && !hasEmittedRef.current) {
      hasEmittedRef.current = true;
      // Small delay to ensure component is mounted
      setTimeout(() => {
        emitFileOpen(events, initialFilePath);
      }, 100);
    }
  }, [initialFilePath, events]);

  const props: PanelComponentProps = { context, actions, events };
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MDXEditorPanel {...props} />
    </div>
  );
};

const meta: Meta<typeof MDXEditorPanelWithMocks> = {
  title: 'Panels/MDXEditorPanel',
  component: MDXEditorPanelWithMocks,
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
type Story = StoryObj<typeof MDXEditorPanelWithMocks>;

export const ReadmeFile: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/docs/README.md',
    initialFiles: {
      '/Users/developer/my-project/docs/README.md': mockReadmeContent,
    },
  },
};

export const BlogPost: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/blog/getting-started.mdx',
    initialFiles: {
      '/Users/developer/my-project/blog/getting-started.mdx': mockBlogPostContent,
    },
  },
};

export const NoFileSelected: Story = {
  args: {
    initialFilePath: undefined,
  },
};

export const MultipleMarkdownFiles: Story = {
  args: {
    initialFilePath: '/Users/developer/my-project/docs/README.md',
    initialFiles: {
      '/Users/developer/my-project/docs/README.md': mockReadmeContent,
      '/Users/developer/my-project/blog/getting-started.mdx': mockBlogPostContent,
    },
  },
};
