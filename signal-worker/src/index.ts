import { Room } from './room';

export { Room };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/health') {
      return new Response('ok', {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'access-control-allow-origin': '*'
        }
      });
    }

    // WebSocket endpoint: /ws/<ROOM_CODE>
    if (url.pathname.startsWith('/ws/')) {
      const code = decodeURIComponent(url.pathname.slice('/ws/'.length)).trim();
      if (!code || code.length < 6) {
        return new Response('Room code must be 6+ characters', { status: 400 });
      }
      const id = env.ROOM.idFromName(code.toUpperCase());
      const stub = env.ROOM.get(id);
      return stub.fetch(req);
    }

    return new Response('Not found', { status: 404 });
  }
} satisfies ExportedHandler<Env>;

interface Env {
  ROOM: DurableObjectNamespace<Room>;
}
