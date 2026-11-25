import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// The popup is built into dist/; public/ (manifest, content.js, icons) is copied as-is.
// Load dist/ as an unpacked extension.
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome120' },
});
