import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace <repo-name> with your actual GitHub repository name.
const repoName = 'Technosync-ai';

export default defineConfig({
  base: `/${repoName}/`,
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to backend (assumed running on localhost:3001)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
