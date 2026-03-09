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
    host: "localhost"
  }
})