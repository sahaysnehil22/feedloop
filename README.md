# FeedLoop

A tiny embeddable feedback widget for indie builders — suggest, vote, roadmap, changelog — from a single line of script. **English + Spanish** throughout (landing, widget, dashboard strings).

Built as the answer to "can we build Harku?": yes — this is the working v1.

## What you get

- **Landing** (`/en`, `/es`) — marketing page with install snippet, feature grid, pricing, and a live-demo slot
- **Widget** (`/w?key=pk_…`) — the iframe app: idea board with search + anonymous one-click voting, suggest form with similar-idea dedup, public roadmap, changelog with unread badge
- **Embed loader** (`/loader.js`) — ~2–3 KB, the only thing that touches the host page; renders the Feedback pill and opens the widget iframe
- **Dashboard** (`/dashboard`) — email/password auth, projects, suggestion triage with statuses + internal notes, drag-free roadmap board, changelog publisher, appearance settings, install snippet
- **Public API** (`/api/public/*`) — key-validated, rate-limited, honeypot + content-filter spam defense; writes use the service-role key server-side, reads are RLS-protected

## Stack

Next.js 15 + React 19, Supabase (Postgres + Auth + RLS), plain CSS. No UI framework. Free tiers cover the start.

## Setup (about 5 minutes)

1. **Create a Supabase project** (free) at supabase.com.
2. **Run the schema**: open SQL editor, paste `supabase/schema.sql`, run it.
3. **Auth**: in Authentication > Sign In / Up, make sure *Email* provider is on. (Email confirmations optional — turn off "Confirm email" for instant testing.)
4. **Env**: `cp .env.example .env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY` (same page — server only, never expose)
   - `NEXT_PUBLIC_APP_URL` (your deployment URL; `http://localhost:3000` locally)
5. **Run**: `npm install && npm run dev` → open `http://localhost:3000/en`.
6. **First project**: sign up at `/dashboard/login`, create a project, copy the snippet into any site.
7. **Live demo on the landing** (optional): create a project named "Demo", copy its public key into `.env.local` as `NEXT_PUBLIC_DEMO_KEY=pk_…`, restart. The landing page then dogfoods the real widget.

## Deploy

- Push to GitHub, import into Vercel, add the same env vars. `NEXT_PUBLIC_APP_URL` must be the production URL or the install snippet will point at localhost.
- Rate limiting is in-memory per instance (fine to start; move to Redis/Upstash if you scale past one instance).

## Project structure

```
public/loader.js            embed script (dependency-free)
supabase/schema.sql         tables + vote trigger + RLS policies
src/lib/i18n.ts             en/es strings (landing, widget, dashboard)
src/lib/types.ts            shared types
src/lib/supabase.ts         anon + service-role clients
src/lib/public-api.ts       key validation, rate limit, spam helpers
src/app/[lang]/page.tsx     landing (en/es)
src/app/w/                  widget iframe app
src/app/dashboard/          login, project list, project detail
src/app/api/public/         config, suggestions, vote, changelog, similar
src/app/globals.css         all styles (light + dark)
```

## What's deliberately v1

- Similar-idea dedup is keyword-based (upgrade: pgvector embeddings)
- No close-the-loop emails yet (voter emails are collected and stored; wire Resend/Postmark next)
- No Slack/Discord/Telegram/webhook integrations yet
- No billing (badge removal etc. are settings flags for now)

## Clean-room note

FeedLoop was built from a functional analysis of the feedback-widget category. All code, copy, and branding here are original.
