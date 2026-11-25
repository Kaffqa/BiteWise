import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

function localApiMiddlewarePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'bitewise-local-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/ai.ts');
          await mod.handleAiRequest(req, res, env);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err?.message || 'Local AI proxy error' }));
        }
      });

      server.middlewares.use('/api/account', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/account.ts');
          await mod.handleAccountRequest(req, res, env);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err?.message || 'Local account proxy error' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      localApiMiddlewarePlugin(env),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
