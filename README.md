# 67

A free, no-login, high-quality 1:1 video calling app.

- P2P media via WebRTC
- No accounts
- Join with a 6+ character code
- Designed to host the frontend on Cloudflare Pages (free tier)
- Signaling via a Cloudflare Worker (Durable Object) (also free tier)

## Local dev

1. Install deps:

```bash
npm install
```

2. Run the signaling worker (WebSocket signaling):

```bash
npm run dev:signal
```

3. In another terminal, run the web app:

```bash
npm run dev
```

4. Set `.env`:

```bash
cp .env.example .env
```

Set `VITE_SIGNAL_BASE=ws://127.0.0.1:8787`.

## Deploy (Cloudflare)

1. Deploy signaling worker:

```bash
npm run deploy:signal
```

After deploying, Wrangler will show a `*.workers.dev` URL.

2. Deploy Pages:

- Build: `npm run build`
- Output dir: `dist`
- Environment variable: `VITE_SIGNAL_BASE` set to `wss://<your-worker>.workers.dev`

Or CLI:

```bash
npm run build\nnpm run deploy:pages
```

## Notes

- This ships with STUN-only by default. Some restrictive networks may require TURN (not included).
- Durable Objects and TURN can have billing implications depending on your Cloudflare plan. This repo is built to run on free-tier friendly primitives, but you should verify current Cloudflare pricing before production use.
