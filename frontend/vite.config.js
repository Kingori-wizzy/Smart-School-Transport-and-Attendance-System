import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://192.168.1.65:5000',
        changeOrigin: true,
        secure: false,
        // No rewrite needed - keep /api prefix
      }
    }
  }
})