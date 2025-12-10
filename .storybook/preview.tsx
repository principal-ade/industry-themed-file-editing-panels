import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { ThemeProvider } from '@principal-ade/industry-theme';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Introduction', 'Panels', '*'],
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ height: '100%', width: '100%' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default preview;
