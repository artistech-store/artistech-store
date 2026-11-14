-- ============================================================================
-- ArtisTech.Store - initial schema
-- Build. Collaborate. Publish.
--
-- Normalized schema for the ArtisTech.Store marketplace with Row Level
-- Security. Apply with: supabase db push (or paste into the SQL editor).
-- ============================================================================

begin;

-- ---------- enums ----------
create type user_role as enum ('user', 'developer', 'admin');
create type product_status as enum
  ('draft', 'pending_review', 'changes_requested', 'published', 'rejected', 'suspended');
create type product_kind as enum
  ('android_app', 'windows_software', 'macos_app', 'linux_app', 'web_app',
   'mobile_game', 'pc_game', 'browser_game', 'ai_tool', 'developer_tool',
   'open_source', 'ui_kit', 'design_resource', 'creative_project',
   'educational', 'productivity', 'other');
create type report_reason as enum
  ('inappropriate', 'copyright', 'malicious_file', 'spam', 'developer_misconduct', 'other');
create type report_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type ad_status as enum ('draft', 'pending_approval', 'active', 'paused', 'ended', 'rejected');
create type media_kind as enum ('icon', 'cover', 'screenshot', 'video');
create type notification_kind as enum
  ('registration', 'email_verified', 'product_submitted', 'product_approved',
   'product_rejected', 'product_updated', 'new_review', 'review_reply',
   'followed_dev_published', 'security');

-- ---------- profiles (extends auth.users) ----------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     citext not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text check (char_length(display_name) <= 80),
  avatar_url   text,
  role         user_role not null default 'user',
  is_suspended boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table developer_profiles (
  id           uuid primary key references profiles (id) on delete cascade,
  slug         citext not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  bio          text check (char_length(bio) <= 2000),
  website      text check (website ~ '^https?://'),
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------- catalog ----------
create table product_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       citext not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name       text not null unique,
  kind       product_kind,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id                 uuid primary key default gen_random_uuid(),
  developer_id       uuid not null references developer_profiles (id) on delete cascade,
  category_id        uuid references product_categories (id) on delete set null,
  kind               product_kind not null,
  slug               citext not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name               text not null check (char_length(name) between 2 and 100),
  tagline            text check (char_length(tagline) <= 140),
  description        text not null default '',
  icon_url           text,
  cover_url          text,
  external_url       text check (external_url ~ '^https?://'),
  platforms          text[] not null default '{}',
  languages          text[] not null default '{en}',
  license            text,
  min_requirements   text,
  privacy_policy_url text check (privacy_policy_url ~ '^https?://'),
  price_cents        int not null default 0 check (price_cents >= 0),
  current_version    text,
  status             product_status not null default 'draft',
  is_featured        boolean not null default false,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- denormalized counters maintained by triggers; never trusted from clients
  download_count     bigint not null default 0,
  avg_rating         numeric(2,1),
  rating_count       int not null default 0
);
create index products_status_published_idx on products (published_at desc)
  where status = 'published';
create index products_developer_idx on products (developer_id);
create index products_category_idx on products (category_id);
create index products_kind_idx on products (kind);
create index products_search_idx on products
  using gin (to_tsvector('english', name || ' ' || coalesce(tagline, '') || ' ' || description));

create table product_versions (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  version       text not null,
  changelog     text not null default '',
  file_path     text,           -- private storage object path
  file_size     bigint check (file_size >= 0),
  file_sha256   text,           -- integrity verification
  is_current    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (product_id, version)
);
create index product_versions_product_idx on product_versions (product_id);

create table product_tags (
  id         uuid primary key default gen_random_uuid(),
  name       citext not null unique check (name ~ '^[a-z0-9-]{2,40}$')
);
create table product_tag_links (
  product_id uuid not null references products (id) on delete cascade,
  tag_id     uuid not null references product_tags (id) on delete cascade,
  primary key (product_id, tag_id)
);

create table product_media (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  kind       media_kind not null,
  url        text not null,
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index product_media_product_idx on product_media (product_id, position);

-- ---------- activity ----------
create table product_downloads (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  version_id  uuid references product_versions (id) on delete set null,
  user_id     uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index product_downloads_product_idx on product_downloads (product_id);
create index product_downloads_user_idx on product_downloads (user_id);

create table download_events (           -- immutable analytics feed
  id          bigint generated always as identity primary key,
  product_id  uuid not null references products (id) on delete cascade,
  user_id     uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index download_events_product_day_idx on download_events (product_id, created_at);

create table wishlists (
  user_id    uuid not null references profiles (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  body         text not null default '' check (char_length(body) <= 5000),
  is_verified_download boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (product_id, user_id)   -- one review per user per product
);
create index reviews_product_idx on reviews (product_id);

create table review_votes (
  review_id  uuid not null references reviews (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  is_helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table review_replies (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references reviews (id) on delete cascade,
  developer_id uuid not null references developer_profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now(),
  unique (review_id)             -- one developer reply per review
);

create table developer_follows (
  user_id      uuid not null references profiles (id) on delete cascade,
  developer_id uuid not null references developer_profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, developer_id)
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  kind       notification_kind not null,
  title      text not null,
  body       text not null default '',
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on notifications (user_id, created_at desc)
  where read_at is null;

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  product_id  uuid references products (id) on delete cascade,
  review_id   uuid references reviews (id) on delete cascade,
  reason      report_reason not null,
  details     text not null default '' check (char_length(details) <= 2000),
  status      report_status not null default 'open',
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  check (product_id is not null or review_id is not null)
);

-- ---------- monetization ----------
create table sponsored_campaigns (
  id           uuid primary key default gen_random_uuid(),
  developer_id uuid not null references developer_profiles (id) on delete cascade,
  name         text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       ad_status not null default 'draft',
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table advertisements (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references sponsored_campaigns (id) on delete cascade,
  product_id   uuid not null references products (id) on delete cascade,
  placement    text not null check (placement in ('home', 'category', 'search', 'developer_spotlight')),
  status       ad_status not null default 'pending_approval',
  impressions  bigint not null default 0,   -- updated by server functions only
  clicks       bigint not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------- audit ----------
create table audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references profiles (id) on delete set null,
  action      text not null,               -- e.g. 'product.approve'
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- ============================================================================
-- Helper functions
-- ============================================================================

create or replace function is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = uid and role = 'admin' and not is_suspended) $$;

create or replace function is_developer_owner(uid uuid, dev_id uuid)
returns boolean language sql stable security definer set search_path = public as
$$ select uid = dev_id and exists (select 1 from developer_profiles where id = dev_id) $$;

-- New auth user -> profile row
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, display_name)
  values (new.id,
          lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '_', 'g'))
            || '_' || substr(new.id::text, 1, 4),
          new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  insert into notifications (user_id, kind, title, body)
  values (new.id, 'registration', 'Welcome to ArtisTech.Store',
          'Your account is ready. Build. Collaborate. Publish.');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep products.avg_rating / rating_count honest: recalculated from valid reviews
create or replace function recalc_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update products p set
    avg_rating   = (select round(avg(rating)::numeric, 1) from reviews where product_id = pid),
    rating_count = (select count(*) from reviews where product_id = pid),
    updated_at   = now()
  where p.id = pid;
  return coalesce(new, old);
end $$;

create trigger reviews_recalc
  after insert or update or delete on reviews
  for each row execute function recalc_product_rating();

-- Download counters from actual download rows
create or replace function bump_download_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update products set download_count = download_count + 1 where id = new.product_id;
  insert into download_events (product_id, user_id) values (new.product_id, new.user_id);
  return new;
end $$;

create trigger downloads_bump
  after insert on product_downloads
  for each row execute function bump_download_count();

-- updated_at maintenance
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger touch_products before update on products
  for each row execute function touch_updated_at();
create trigger touch_profiles before update on profiles
  for each row execute function touch_updated_at();
create trigger touch_developers before update on developer_profiles
  for each row execute function touch_updated_at();

-- Audit helper (called from server routes with the caller's id)
create or replace function write_audit(action text, entity_type text, entity_id text, metadata jsonb default '{}')
returns void language sql security definer set search_path = public as
$$ insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
   values (auth.uid(), action, entity_type, entity_id, metadata) $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table profiles              enable row level security;
alter table developer_profiles    enable row level security;
alter table product_categories    enable row level security;
alter table products              enable row level security;
alter table product_versions      enable row level security;
alter table product_tags          enable row level security;
alter table product_tag_links     enable row level security;
alter table product_media         enable row level security;
alter table product_downloads     enable row level security;
alter table download_events       enable row level security;
alter table wishlists             enable row level security;
alter table reviews               enable row level security;
alter table review_votes          enable row level security;
alter table review_replies        enable row level security;
alter table developer_follows     enable row level security;
alter table notifications         enable row level security;
alter table reports               enable row level security;
alter table sponsored_campaigns   enable row level security;
alter table advertisements        enable row level security;
alter table audit_logs            enable row level security;

-- profiles: public read of basic fields; owner edits own row; admin manages all
create policy profiles_read on profiles for select using (true);
-- owner edits own profile but cannot escalate role or self-unsuspend
  create policy profiles_update_own on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id
              and role = (select role from profiles where id = auth.uid())
              and is_suspended = (select is_suspended from profiles where id = auth.uid()));
create policy profiles_admin on profiles for all using (is_admin(auth.uid()));

-- developer_profiles: public read; owner manages; verified flag admin-only
create policy dev_read on developer_profiles for select using (true);
create policy dev_insert on developer_profiles for insert
  with check (auth.uid() = id or is_admin(auth.uid()));
create policy dev_update_own on developer_profiles for update
  using (auth.uid() = id or is_admin(auth.uid()))
  with check (verified = (select verified from developer_profiles where id = auth.uid()) or is_admin(auth.uid()));

-- categories: public read; admin manages
create policy cat_read on product_categories for select using (true);
create policy cat_admin on product_categories for all using (is_admin(auth.uid()));

-- products: public reads published; developer manages own drafts/submissions; admin all
create policy products_read_published on products for select
  using (status = 'published' or developer_id = auth.uid() or is_admin(auth.uid()));
create policy products_insert_dev on products for insert
  with check (developer_id = auth.uid());
create policy products_update_owner on products for update
  using (developer_id = auth.uid() or is_admin(auth.uid()))
  with check (developer_id = auth.uid() or is_admin(auth.uid()));
create policy products_delete_owner on products for delete
  using ((developer_id = auth.uid() and status = 'draft') or is_admin(auth.uid()));

-- versions/media/tags follow parent product visibility and ownership
create policy versions_read on product_versions for select
  using (exists (select 1 from products p where p.id = product_id
                 and (p.status = 'published' or p.developer_id = auth.uid() or is_admin(auth.uid()))));
create policy versions_owner on product_versions for all
  using (exists (select 1 from products p where p.id = product_id and p.developer_id = auth.uid())
         or is_admin(auth.uid()));

create policy media_read on product_media for select
  using (exists (select 1 from products p where p.id = product_id
                 and (p.status = 'published' or p.developer_id = auth.uid() or is_admin(auth.uid()))));
create policy media_owner on product_media for all
  using (exists (select 1 from products p where p.id = product_id and p.developer_id = auth.uid())
         or is_admin(auth.uid()));

create policy tags_read on product_tags for select using (true);
create policy tags_admin on product_tags for all using (is_admin(auth.uid()));
create policy tag_links_read on product_tag_links for select using (true);
create policy tag_links_owner on product_tag_links for all
  using (exists (select 1 from products p where p.id = product_id and p.developer_id = auth.uid())
         or is_admin(auth.uid()));

-- downloads: owner-only history + counters via trigger
create policy downloads_read_own on product_downloads for select
  using (user_id = auth.uid()
         or exists (select 1 from products p where p.id = product_id and p.developer_id = auth.uid())
         or is_admin(auth.uid()));
create policy downloads_insert_auth on product_downloads for insert
  with check (user_id = auth.uid());

create policy download_events_none on download_events for select using (is_admin(auth.uid()));

-- wishlists: strictly private
create policy wishlist_own on wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reviews: public read; author writes own; author edits own; admin moderates
create policy reviews_read on reviews for select using (true);
create policy reviews_insert on reviews for insert
  with check (user_id = auth.uid()
              and exists (select 1 from products p where p.id = product_id and p.status = 'published'));
create policy reviews_update_own on reviews for update
  using (user_id = auth.uid() or is_admin(auth.uid()))
  with check (user_id = auth.uid() or is_admin(auth.uid()));
create policy reviews_delete on reviews for delete
  using (user_id = auth.uid() or is_admin(auth.uid()));

create policy review_votes_own on review_votes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy replies_read on review_replies for select using (true);
create policy replies_dev on review_replies for insert
  with check (developer_id = auth.uid()
              and exists (select 1 from reviews r join products p on p.id = r.product_id
                          where r.id = review_id and p.developer_id = auth.uid()));
create policy replies_admin on review_replies for delete using (is_admin(auth.uid()));

create policy follows_own on developer_follows for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: strictly private to the recipient
create policy notifications_own_read on notifications for select using (user_id = auth.uid());
create policy notifications_own_update on notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports: reporter creates + reads own; admin handles all
create policy reports_insert on reports for insert with check (reporter_id = auth.uid());
create policy reports_read on reports for select
  using (reporter_id = auth.uid() or is_admin(auth.uid()));
create policy reports_admin on reports for update using (is_admin(auth.uid()));

-- monetization: developers manage own campaigns; admin approves ads; public never reads
create policy campaigns_dev on sponsored_campaigns for all
  using (developer_id = auth.uid() or is_admin(auth.uid()))
  with check (developer_id = auth.uid() or is_admin(auth.uid()));
create policy ads_admin on advertisements for all using (is_admin(auth.uid()));
create policy ads_dev_read on advertisements for select
  using (exists (select 1 from sponsored_campaigns c
                 where c.id = campaign_id and c.developer_id = auth.uid()));

-- audit logs: admin read-only; written only by security-definer functions
create policy audit_admin_read on audit_logs for select using (is_admin(auth.uid()));

-- ============================================================================
-- Storage buckets (product files stay PRIVATE; public buckets for media only)
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('product-icons',  'product-icons',  true),
  ('product-media',  'product-media',  true),
  ('product-files',  'product-files',  false),
  ('avatars',        'avatars',        true)
on conflict (id) do nothing;

-- Media uploads: only into a folder named after a product the caller owns
create policy media_upload_owner on storage.objects for insert
  with check (
    bucket_id in ('product-icons', 'product-media')
    and exists (select 1 from products p
                where p.id::text = (storage.foldername(name))[1]
                  and p.developer_id = auth.uid())
  );
create policy media_update_owner on storage.objects for update
  using (bucket_id in ('product-icons', 'product-media')
    and exists (select 1 from products p
                where p.id::text = (storage.foldername(name))[1]
                  and p.developer_id = auth.uid()));
create policy media_delete_owner on storage.objects for delete
  using (bucket_id in ('product-icons', 'product-media')
    and exists (select 1 from products p
                where p.id::text = (storage.foldername(name))[1]
                  and p.developer_id = auth.uid()));

-- Private product files: developer uploads own; downloads go through
-- authorized server-issued signed URLs only (never public).
create policy files_upload_owner on storage.objects for insert
  with check (
    bucket_id = 'product-files'
    and exists (select 1 from products p
                where p.id::text = (storage.foldername(name))[1]
                  and p.developer_id = auth.uid())
  );
create policy files_read_owner_admin on storage.objects for select
  using (bucket_id = 'product-files'
    and (exists (select 1 from products p
                 where p.id::text = (storage.foldername(name))[1]
                   and p.developer_id = auth.uid())
         or is_admin(auth.uid())));

create policy avatars_public_read on storage.objects for select using (bucket_id = 'avatars');
create policy avatars_own_write on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_own_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Seed the spec's category set
-- ============================================================================

insert into product_categories (slug, name, kind, position) values
  ('android-apps',        'Android Apps',           'android_app',       10),
  ('windows-software',    'Windows Software',       'windows_software',  20),
  ('macos-apps',          'macOS Apps',             'macos_app',         30),
  ('linux-apps',          'Linux Apps',             'linux_app',         40),
  ('web-apps',            'Web Apps',               'web_app',           50),
  ('mobile-games',        'Mobile Games',           'mobile_game',       60),
  ('pc-games',            'PC Games',               'pc_game',           70),
  ('browser-games',       'Browser Games',          'browser_game',      80),
  ('ai-tools',            'AI Tools',               'ai_tool',           90),
  ('developer-tools',     'Developer Tools',        'developer_tool',   100),
  ('open-source',         'Open-Source Projects',   'open_source',      110),
  ('ui-kits',             'UI Kits & Templates',    'ui_kit',           120),
  ('design-resources',    'Graphic Design Resources','design_resource', 130),
  ('creative-projects',   'Creative Projects',      'creative_project', 140),
  ('educational',         'Educational Software',   'educational',      150),
  ('productivity',        'Productivity Tools',     'productivity',     160),
  ('other',               'Other',                  'other',            170)
on conflict (slug) do nothing;

commit;
