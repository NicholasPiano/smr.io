import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for React with sane dev server defaults for Docker
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true
    }
  }
});



