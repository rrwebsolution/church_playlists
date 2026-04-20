import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { createObsStateService } from "./server/obs-state-service.js";

// In-memory state store so OBS Browser Source can sync without a backend
function obsStatePlugin(): Plugin {
  const obsStateService = createObsStateService();

  return {
    name: 'obs-state',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/projector' || req.url?.startsWith('/projector?')) {
          req.url = '/index.html';
        }
        next();
      });

      server.middlewares.use('/api/obs-state/stream', obsStateService.handleStreamRequest);
      server.middlewares.use('/api/obs-state', obsStateService.handleStateRequest);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), obsStatePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/backend-api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend-api/, '/api'),
      },
    },
    // This is a common addition for SPA routing on platforms like Vercel
    // It ensures that when you hit a route like /projector directly,
    // Vite serves your index.html, allowing React Router (or similar) to handle it.
    // This might not be strictly necessary if Vercel handles routing correctly,
    // but it's a good practice for SPAs.
    // historyApiFallback: {
    //   index: '/index.html',
    // },
  },
  // Optional: If you need to configure build options for deployment
  // build: {
  //   outDir: 'dist', // Default
  //   // If you encounter issues with assets, you might need to adjust this
  //   // assetsPublicPath: '/', // Default
  // },
});
