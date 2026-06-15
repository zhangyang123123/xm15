import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { initDatabase } from './db';
import { router, setWebSocketServer } from './routes';

initDatabase();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors());
app.use(express.json());
app.use('/api', router);

const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (_req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

setWebSocketServer(wss);

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Poll server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});
