import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // If the request doesn't have a file extension and it's not an API route,
            // serve index.html so React Router can handle it
            if (!path.extname(req.url) && !req.url.startsWith('/api') && req.url !== '/') {
              const indexPath = path.join(__dirname, 'index.html');
              if (fs.existsSync(indexPath)) {
                res.end(fs.readFileSync(indexPath, 'utf8'));
              } else {
                next();
              }
            } else {
              next();
            }
          });
        };
      },
    },
  ],

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
    },
  }
})