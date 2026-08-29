import express, { Request, Response } from 'express';
import cors from 'cors';
import { simulatorEngine, METERS } from './backend/kiotSimulator';

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));
app.use(express.json());

app.get('/api/meters/discover', (_req: Request, res: Response) => {
  const meters = simulatorEngine.getDiscoveredMeters();
  res.json(meters.map((m: any) => ({ device_id: m.device_id, device_name: m.device_name })));
});

export default app;
