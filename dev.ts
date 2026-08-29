import path from 'path';
import { createServer as createViteServer } from 'vite';
import app from './server';

const PORT = 3000;

async function startDevServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ KIOT Industrial EMS running on http://localhost:${PORT}`);
  });
}

startDevServer();
