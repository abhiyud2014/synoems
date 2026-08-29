import { METERS } from './kiotSimulator';

export default function handler(req: any, res: any) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', meters: METERS.length }));
}
