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
  },
  define: {
    // Ensure import.meta.env.PROD is properly set
    'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production')
  },
  build: {
    // Production build optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['./src/utils/similarity.ts']
        }
      }
    }
  }
});



