import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Force production JSX runtime to avoid jsxDEV in output
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
    cssInjectedByJsPlugin(),
  ],
  define: {
    // Ensure NODE_ENV is production for React
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: './src/index.tsx',
      name: 'PanelExtension',
      fileName: 'panels.bundle',
      formats: ['es'],
    },
    rollupOptions: {
      // Externalize peer dependencies and Monaco editor - these come from the host application.
      // @pierre/diffs is externalized because it registers a global `<diffs-container>`
      // custom element; bundling our own copy collides with the host's installation
      // and silently loads the wrong stylesheet against the wrong renderer attributes.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'monaco-editor',
        '@monaco-editor/react',
        '@principal-ade/industry-themed-monaco-editor',
        /^@pierre\/diffs(\/.*)?$/,
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'monaco-editor': 'monaco',
          '@monaco-editor/react': 'MonacoReact',
        },
      },
    },
    // Generate sourcemaps for debugging
    sourcemap: true,
    // Ensure production mode build
    minify: false,
  },
  // Force production mode for consistent JSX runtime
  mode: 'production',
}));
