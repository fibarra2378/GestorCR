import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

export class WSService {
  private static wss: WebSocketServer | null = null;

  static init(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Conectado al servidor de eventos GestorCR' }));

      ws.on('ping', () => ws.send(JSON.stringify({ type: 'PONG' })));
    });

    console.log('[WS] WebSocket server initialized on path /ws');
  }

  static broadcast(event: string, payload: any) {
    if (!this.wss) return;

    const data = JSON.stringify({ type: event, payload });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }
}
