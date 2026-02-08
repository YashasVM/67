type Role = 'a' | 'b';

type WireMsg =
  | { t: 'hello'; v: 1; role: Role; peers: number }
  | { t: 'peer-joined' }
  | { t: 'peer-left' }
  | { t: 'full' }
  | { t: 'relay'; payload: unknown };

export class Room implements DurableObject {
  private sessions = new Set<WebSocket>();
  private roles = new Map<WebSocket, Role>();

  constructor(private state: DurableObjectState) {
    // Keep the constructor minimal; the room is purely an in-memory relay.
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade') !== 'websocket') {
      return new Response('Upgrade required', { status: 426 });
    }

    if (this.sessions.size >= 2) {
      // Still accept, then close with a message so the client can show UX.
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      server.send(JSON.stringify({ t: 'full' } satisfies WireMsg));
      server.close(1008, 'room full');
      return new Response(null, { status: 101, webSocket: client });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();
    this.sessions.add(server);

    const role: Role = this.sessions.size === 1 ? 'a' : 'b';
    this.roles.set(server, role);

    server.send(
      JSON.stringify({ t: 'hello', v: 1, role, peers: this.sessions.size } satisfies WireMsg)
    );

    if (this.sessions.size === 2) {
      this.broadcast({ t: 'peer-joined' });
    }

    server.addEventListener('message', (evt) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(evt.data));
      } catch {
        return;
      }

      // Relay to the other peer.
      this.broadcast({ t: 'relay', payload: msg }, server);
    });

    const onClose = () => {
      if (!this.sessions.delete(server)) return;
      this.roles.delete(server);
      this.broadcast({ t: 'peer-left' });
    };

    server.addEventListener('close', onClose);
    server.addEventListener('error', onClose);

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(msg: WireMsg, except?: WebSocket) {
    const data = JSON.stringify(msg);
    for (const ws of this.sessions) {
      if (ws === except) continue;
      try {
        ws.send(data);
      } catch {
        // best-effort
      }
    }
  }
}
