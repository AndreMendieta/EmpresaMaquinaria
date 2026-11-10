import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    {
      name: 'jsx-in-javascript',
      enforce: 'pre',
      async transform(code, id) {
        if (!id.endsWith('.js') || id.includes('/node_modules/')) return null;
        // Las pantallas compartidas conservan JSX dentro de archivos .js para Metro.
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react({ include: /\.[jt]sx?$/ }),
  ],
  resolve: {
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
    ],
    extensions: [
      '.web.js',
      '.web.jsx',
      '.web.ts',
      '.web.tsx',
      '.mjs',
      '.js',
      '.mts',
      '.ts',
      '.jsx',
      '.tsx',
      '.json',
    ],
  },
  optimizeDeps: {
    entries: ['index.html'],
    esbuildOptions: {
      loader: { '.js': 'jsx' },
      resolveExtensions: [
        '.web.js',
        '.web.jsx',
        '.web.ts',
        '.web.tsx',
        '.mjs',
        '.js',
        '.mts',
        '.ts',
        '.jsx',
        '.tsx',
        '.json',
      ],
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'web-build',
    emptyOutDir: true,
  },
});
