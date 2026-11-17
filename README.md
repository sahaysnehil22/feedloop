# FeedLoop

A tiny embeddable feedback widget for indie builders — suggest, vote, roadmap, changelog — from a single line of script. **English + Spanish** throughout (landing, widget, dashboard strings).

Built as the answer to "can we build Harku?": yes — this is the working v1.

## What you get

- **Landing** (`/en`, `/es`) — marketing page with install snippet, feature grid, pricing, and a live-demo slot
- **Widget** (`/w?key=pk_…`) — the iframe app: idea board with search + anonymous one-click voting, suggest form with similar-idea dedup, public roadmap, changelog with unread badge
- **Embed loader** (`/loader.js`) — ~2–3 KB, the only thing that touches the host page; renders the Feedback pill and opens the widget iframe
- **Dashboard** (`/dashboard`) — email/password auth, projects, suggestion triage with statuses + internal notes, drag-free roadmap board, changelog publisher, appearance settings, install snippet
- **Public API** (`/api/public/*`) — key-validated, rate-limited, honeypot + content-filter spam defense; writes use the Firebase Admin SDK server-side, reads are Firestore-rules-protected

## Stack

Next.js 15 + React 19, Firebase (Firestore + Auth + Admin SDK), plain CSS. No UI framework. Free tiers cover the start.

## Setup (about 5 minutes)

1. **Create a Firebase project** (free Spark plan, no card) at console.firebase.google.com. Turn off Google Analytics.
2. **Firestore**: create a database in Production mode. **Auth**: enable the Email/Password sign-in method. **Rules**: paste the Firestore rules (see `FIREBASE.md` or the rules in the project console) and publish.
3. **Service account**: Project Settings → Service accounts → Generate new private key. This JSON is the server credential for the public API routes — never commit it.
4. **Env**: `cp .env.example .env.local` and fill in:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` (Project Settings → Your apps → Web app config)
   - `FIREBASE_SERVICE_ACCOUNT_KEY` (the service-account JSON as a single line — server only, never expose)
   - `NEXT_PUBLIC_APP_URL` (your deployment URL; `http://localhost:3000` locally)
5. **Run**: `npm install && npm run dev` → open `http://localhost:3000/en`.
6. **First project**: sign up at `/dashboard/login`, create a project, copy the snippet into any site.
7. **Live demo on the landing** (optional): create a project named "FeedLoop", copy its public key into `.env.local` as `NEXT_PUBLIC_DEMO_KEY=pk_…`, restart. The landing page then dogfoods the real widget. (`seed-demo.mjs` creates this demo project + sample content; run it with the service-account key available.)

## Deploy

- The Vercel project is **not** Git-connected. Deploy from this folder with `python3 deploy.py` (uploads the source via the Vercel API and creates a production deployment). Set the env vars in the Vercel project settings first — the same vars as `.env.local`, plus `NEXT_PUBLIC_DEMO_KEY` for the live demo.
- `NEXT_PUBLIC_APP_URL` must be the production URL or the install snippet will point at localhost.
- Rate limiting is in-memory per instance (fine to start; move to Redis/Upstash if you scale past one instance).

## Project structure

```
public/loader.js            embed script (dependency-free)
deploy.py                   manual Vercel deploy (project is not Git-connected)
seed-demo.mjs               create the demo project + sample content (Admin SDK)
src/lib/i18n.ts             en/es strings (landing, widget, dashboard)
src/lib/types.ts            shared types
src/lib/firebase.ts         browser Auth + Firestore client
src/lib/firebase-admin.ts   server Admin SDK (API routes only)
src/lib/public-api.ts       key validation, rate limit, spam helpers
src/app/[lang]/page.tsx     landing (en/es)
src/app/w/                  widget iframe app
src/app/dashboard/          login, project list, project detail
src/app/api/public/         config, suggestions, vote, changelog, similar
src/app/globals.css         all styles (light + dark)
```

## What's deliberately v1

- Similar-idea dedup is keyword-based (upgrade: embeddings via a search service)
- No close-the-loop emails yet (voter emails are collected and stored; wire Resend/Postmark next)
- No Slack/Discord/Telegram/webhook integrations yet
- No billing (badge removal etc. are settings flags for now)

## Clean-room note

FeedLoop was built from a functional analysis of the feedback-widget category. All code, copy, and branding here are original.
