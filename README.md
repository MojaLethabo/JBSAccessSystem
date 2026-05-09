# JBS Access — Frontend (Vercel)

Next.js 15 App Router frontend. Deployed on **Vercel**, calls the **Railway** backend API.

## Stack
- Next.js 15 / React 19 / TypeScript
- Tailwind CSS v4
- `@zxing/browser` for QR camera scanning
- No database — all data fetched from the Railway backend

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Railway backend URL (e.g. `https://jbs-backend.up.railway.app`) |

## Local Development

```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3001

npm install
npm run dev   # starts on port 3000
```

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import into Vercel → **Add New Project**
3. Set environment variable `NEXT_PUBLIC_API_URL` to your Railway backend URL
4. Deploy — Vercel auto-detects Next.js

## Routes

| Path | Description |
|---|---|
| `/` | Landing page |
| `/login` | Organizer login |
| `/signup` | Organizer registration |
| `/dashboard` | Event management |
| `/events/[id]` | Event detail + guest list |
| `/checkin/[eventId]` | Camera QR check-in desk |
| `/register/[eventToken]` | Public guest registration (no login required) |
