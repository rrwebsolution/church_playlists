import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

// In-memory state store so OBS Browser Source can sync without a backend
function obsStatePlugin(): Plugin {
  let state = { text: '', fontSize: 60, background: 'none', fontFamily: 'Roboto, sans-serif', videoUrl: '', updatedAt: 0 };
  return {
    name: 'obs-state',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/projector' || req.url?.startsWith('/projector?')) {
          req.url = '/index.html';
        }
        next();
      });

      server.middlewares.use('/api/obs-state', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') { res.end(); return; }

        if (req.method === 'GET') {
          res.end(JSON.stringify(state));
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try { state = { ...state, ...JSON.parse(body) }; } catch {}
            res.end(JSON.stringify({ ok: true }));
          });
          return;
        }

        res.statusCode = 405;
        res.end();
      });
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