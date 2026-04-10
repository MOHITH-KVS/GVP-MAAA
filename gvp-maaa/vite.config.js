import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  css: {
    postcss: './postcss.config.cjs',
  },

  server: {
    port: 5173,       // Force Vite to use port 5173
    strictPort: true, // If 5173 is busy, it will stop instead of switching ports
    host: "localhost",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/student": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/faculty": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/login": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  }
})