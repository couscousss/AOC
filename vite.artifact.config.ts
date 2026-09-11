import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

/** Single-file build: everything (JS, CSS, fonts) inlined into one HTML for hosting as a page. */
export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist-single',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 5000,
  },
});
