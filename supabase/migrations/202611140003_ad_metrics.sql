-- ============================================================================
-- ArtisTech.Store - ad metric functions
-- Genuine impression/click counting. Callable by anyone (even logged-out
-- viewers) but only bumps counters on ads that are actually live - no path
-- for clients to inflate arbitrary rows.
-- ============================================================================

begin;

create or replace function record_ad_impression(ad_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update advertisements a set impressions = impressions + 1
  where a.id = ad_id
    and a.status = 'active'
    and exists (select 1 from sponsored_campaigns c
                where c.id = a.campaign_id and c.status = 'active'
                  and now() between c.starts_at and c.ends_at);
end $$;

create or replace function record_ad_click(ad_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update advertisements a set clicks = clicks + 1
  where a.id = ad_id
    and a.status = 'active'
    and exists (select 1 from sponsored_campaigns c
                where c.id = a.campaign_id and c.status = 'active'
                  and now() between c.starts_at and c.ends_at);
end $$;

-- Public read path for live ads (RLS keeps the raw tables admin/developer-only).
-- Returns only what a storefront placement needs.
create or replace function get_live_ads(p_placement text)
returns table (
  ad_id uuid, product_id uuid, slug citext, name text, tagline text,
  icon_url text, developer_name text
) language sql stable security definer set search_path = public as $$
  select a.id, p.id, p.slug, p.name, p.tagline, p.icon_url, d.display_name
  from advertisements a
  join sponsored_campaigns c on c.id = a.campaign_id
  join products p on p.id = a.product_id and p.status = 'published'
  join developer_profiles d on d.id = p.developer_id
  where a.placement = p_placement
    and a.status = 'active' and c.status = 'active'
    and now() between c.starts_at and c.ends_at
  order by a.created_at desc
  limit 3;
$$;

-- Anyone viewing the store may trigger a metric; the function itself decides
-- whether the ad is live. No row data is returned.
grant execute on function record_ad_impression(uuid) to anon, authenticated;
grant execute on function record_ad_click(uuid) to anon, authenticated;

-- Developers create sponsorship ads on their own campaigns; ads start as
-- 'pending_approval' and only an admin can activate them (ads_admin policy).
-- developer_profiles.id is the profile id, so developer_id = auth.uid().
create policy ads_dev_insert on advertisements for insert with check (
  status = 'pending_approval'
  and exists (select 1 from sponsored_campaigns c
              where c.id = campaign_id and c.developer_id = auth.uid())
  and exists (select 1 from products p
              where p.id = product_id and p.developer_id = auth.uid())
);

-- A developer may withdraw a still-pending ad (mark it ended).
create policy ads_dev_withdraw on advertisements for update
  using (status = 'pending_approval'
    and exists (select 1 from sponsored_campaigns c
                where c.id = campaign_id and c.developer_id = auth.uid()))
  with check (status = 'ended'
    and exists (select 1 from sponsored_campaigns c
                where c.id = campaign_id and c.developer_id = auth.uid()));

-- Campaign budget in INR (whole rupees); informational for now - billing
-- arrives with the payment integration.
alter table sponsored_campaigns
  add column if not exists budget_inr integer not null default 0 check (budget_inr >= 0);

commit;
