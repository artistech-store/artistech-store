# ArtisTech.Store - Technical Implementation Plan

## 1. Existing project audit

No prior ArtisTech.Store codebase, database, or deployment exists. The only
existing brand assets are the official ArtisTech logo (bronze head mark), the
brand palette (black + bronze-gold), the tagline "Build. Collaborate.
Publish.", and a separately-built Android concept-demo APK. This is a
greenfield build; there is nothing to preserve except brand identity.

## 2. Architecture

```
Browser / mobile web
        |
   Next.js 14 (App Router, React Server Components)  - Vercel
        |                                         \
   Supabase Auth (cookies)                    Vercel env secrets
        |
   Supabase Postgres (RLS on every table)
   Supabase Storage (public media buckets, private product-files bucket)
```

- Server components query Postgres through RLS as the calling user.
- Sensitive operations (moderation, download authorization, ad metrics) run
  in server routes with the service-role key, never in the browser.
- Middleware refreshes auth sessions; authorization is enforced by RLS plus
  server-side checks.

## 3. Database schema

See `supabase/migrations/202611140001_init.sql`. Tables: profiles,
developer_profiles, product_categories, products, product_versions,
product_tags, product_tag_links, product_media, product_downloads,
download_events, wishlists, reviews, review_votes, review_replies,
developer_follows, notifications, reports, sponsored_campaigns,
advertisements, audit_logs. All with PKs, FKs, unique constraints, indexes
(including a full-text search index), timestamps, and cascade behavior.

Denormalized counters (avg_rating, rating_count, download_count) are
maintained by triggers from source rows, so stats are always derived from
real activity.

## 4. Security architecture

- RLS enabled on every table; policies per role (guest/user/developer/admin).
- Role and suspension changes are admin-only (self-escalation blocked).
- Reviews: one per user per product, enforced by unique constraint.
- storage: media buckets public for read; product-files bucket private with
  owner/admin access; downloads via server-issued signed URLs.
- service-role key only in server environment, never shipped to the client.
- Audit log written by security-definer function; admin read-only.

## 5. API plan

Most reads go straight through the Supabase client (RLS-guarded). Dedicated
server routes for: download authorization + signed URLs, product submission
for moderation, admin approve/reject/suspend, ad impression/click tracking,
notification fan-out.

## 6. Frontend plan

Phase 1 (done): architecture, brand system (official logo, black/bronze-gold
tokens, light/dark/system themes), layout shell, homepage with all ten
spec sections wired to live queries with honest empty states, explore with
search/filter/sort/pagination, categories, developers, auth form,
publishing entry, static policy pages, sitemap, robots.

Later phases per the spec: profiles, product pages + secure downloads,
publishing wizard, admin/moderation, reviews/wishlist/notifications,
analytics/ads, hardening/SEO/deploy.

## 7. Testing strategy

`npm run typecheck` and `npm run build` on every phase. Real workflow tests
against the live Supabase project once credentials land: auth, publish,
moderate, download, review, wishlist, notify; plus negative RLS tests
(cross-account edits, anonymous private reads) proving policies hold.

## 8. Deployment strategy

GitHub repo -> Vercel import -> env vars -> deploy -> verify live before
claiming done. Database migrations applied via Supabase CLI or SQL editor.
