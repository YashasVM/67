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

2. Run the signaling worker:

```bash
npm run dev:signal
```

3. Run the web app:

```bash
npm run dev
```

## Notes

- This ships with STUN-only by default. Some restrictive networks may require TURN (not included).
