import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin } from "vite"

// In-memory state store so OBS Browser Source can sync without a backend
function obsStatePlugin(): Plugin {
  let state = { text: '', fontSize: 60, background: 'none', updatedAt: 0 };
  return {
    name: 'obs-state',
    configureServer(server) {
      server.middlewares.use('/obs-state', (req, res) => {
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
    host: true
  }
})