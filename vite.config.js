import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

// The manifest lives in extension/, not public/, so only the built dist/ folder is a loadable extension
// (loading public/ by mistake gave a popup with no index.html). Its version follows package.json.
function extensionManifest() {
  const src = new URL('./extension/manifest.json', import.meta.url);
  return {
    name: 'extension-manifest',
    apply: 'build',
    buildStart() { this.addWatchFile(src.pathname.replace(/^\/(\w:)/, '$1')); },
    generateBundle() {
      const manifest = JSON.parse(readFileSync(src, 'utf8'));
      manifest.version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
      this.emitFile({ type: 'asset', fileName: 'manifest.json', source: JSON.stringify(manifest, null, 2) });
    },
  };
}

// The popup is built into dist/; public/ (content.js, icons) is copied as-is. Load dist/ as an unpacked extension.
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss(), extensionManifest()],
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome120' },
});
