# ArtisTech.Store

**Build. Collaborate. Publish.**

A modern digital marketplace for applications, games, development tools, and creative digital projects. Creators publish for free; visitors discover, download, review, and follow.

- Frontend: Next.js 14, React 18, TypeScript (App Router)
- Backend: Supabase (Auth, PostgreSQL, Storage, Row Level Security)
- Hosting: Vercel
- Source control: GitHub

## Repository layout

```
src/
  app/                  # Routes (App Router)
    page.tsx            # Homepage - all sections read live database records
    explore/            # Search + filters + sorting + pagination
    categories/         # Category browser
    developers/         # Developer directory
    publish/            # Publishing portal entry (auth-gated)
    sign-in/            # Email/password auth (Supabase Auth)
    [page]/             # About, Help, Privacy, Terms, Guidelines
    sitemap.ts          # Dynamic sitemap (includes published products)
  components/           # Header, footer, cards, theme toggle, states
  lib/
    supabase/           # Browser + server clients (RLS-respecting)
    data.ts             # All marketplace queries
    types.ts            # Domain types mirroring the schema
  middleware.ts         # Session refresh
supabase/
  migrations/           # Full schema: tables, RLS, triggers, storage buckets
public/brand/           # Official ArtisTech logo (used exactly as supplied)
docs/                   # Implementation plan
```

## Setup

1. Install Node.js 18.17+ (or 20+).
2. `npm install`
3. Create a Supabase project, then copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never exposed to the browser)
   - `NEXT_PUBLIC_SITE_URL`
4. Apply the database schema:
   - `supabase link --project-ref YOUR-REF && supabase db push`, or
   - paste `supabase/migrations/202611140001_init.sql` into the Supabase SQL editor.
5. `npm run dev` -> http://localhost:3000

Until step 3-4 are done the site still builds and renders, with every
data-driven section showing its honest empty state. Nothing is mocked.

## Testing

- `npm run typecheck` - strict TypeScript over the whole codebase
- `npm run build` - production build verification
- Manual workflow tests (per build plan): auth, publishing, moderation,
  downloads, reviews, wishlists, notifications, RLS checks

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Set the four environment variables from `.env.example` in the Vercel
   project settings.
4. Deploy. Verify the live deployment before calling it done.

## Security notes

- Every table has Row Level Security policies; the anon key alone cannot
  read private data.
- Product distribution files live in a private storage bucket; downloads
  are authorized server-side via short-lived signed URLs.
- Rating/download counters are maintained by database triggers, never
  trusted from clients.
- Administrative actions are recorded in `audit_logs`.
