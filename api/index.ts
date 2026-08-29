import type { IncomingMessage, ServerResponse } from 'http';

let app: any = null;

async function getApp() {
  if (!app) {
    const mod = await import('../server');
    app = mod.default;
  }
  return app;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const expressApp = await getApp();
    expressApp(req, res);
  } catch (err: any) {
    console.error('Function error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error', details: err.message }));
  }
}
