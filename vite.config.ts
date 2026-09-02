import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: served at https://<user>.github.io/app-rooftop-solar/
export default defineConfig({
  plugins: [react()],
  base: '/app-rooftop-solar/',
});
