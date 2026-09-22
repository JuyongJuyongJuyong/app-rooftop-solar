import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: served at https://<user>.github.io/app-rooftop-solar/
export default defineConfig({
  plugins: [react()],
  base: '/app-rooftop-solar/',
  test: {
    // RoofMap imports leaflet, which touches `window` at module load time
    // (not just when used) — vitest's default 'node' environment has no
    // window/document, so any test importing App (which imports RoofMap)
    // fails with "ReferenceError: window is not defined" before jsdom is
    // set here. Needs the `jsdom` devDependency (see package.json).
    environment: 'jsdom',
  },
});
