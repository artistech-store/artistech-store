-- ============================================================================
-- ArtisTech.Store - notification fan-out triggers
-- Real in-app notifications generated from real events.
-- ============================================================================

begin;

-- Product status changes -> notify the owning developer
create or replace function notify_product_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'pending_review' then
      insert into notifications (user_id, kind, title, body, link)
      values (new.developer_id, 'product_submitted',
              'Submission received', new.name || ' is in the moderation queue.',
              '/dashboard/developer');
    elsif new.status = 'published' then
      insert into notifications (user_id, kind, title, body, link)
      values (new.developer_id, 'product_approved',
              'Product approved', new.name || ' is now live on ArtisTech.Store.',
              '/products/' || new.slug);
      -- followers of this developer hear about it too
      insert into notifications (user_id, kind, title, body, link)
      select f.user_id, 'followed_dev_published',
             'New from a developer you follow',
             new.name || ' was just published.',
             '/products/' || new.slug
      from developer_follows f
      where f.developer_id = new.developer_id
        and f.user_id <> new.developer_id;
    elsif new.status = 'rejected' then
      insert into notifications (user_id, kind, title, body, link)
      values (new.developer_id, 'product_rejected',
              'Product rejected', new.name || ' was not approved. Check the moderation notes and resubmit.',
              '/dashboard/developer');
    end if;
  end if;
  return new;
end $$;

create trigger products_notify_status
  after update on products
  for each row execute function notify_product_status();

-- New review -> notify the product's developer
create or replace function notify_new_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare dev uuid; pname text;
begin
  select developer_id, name into dev, pname from products where id = new.product_id;
  if dev is not null and dev <> new.user_id then
    insert into notifications (user_id, kind, title, body, link)
    values (dev, 'new_review',
            'New review on ' || pname,
            new.rating || ' stars' || case when new.body <> '' then ': ' || left(new.body, 120) else '' end,
            '/dashboard/developer');
  end if;
  return new;
end $$;

create trigger reviews_notify_new
  after insert on reviews
  for each row execute function notify_new_review();

-- Developer reply -> notify the review author
create or replace function notify_review_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  select user_id into author from reviews where id = new.review_id;
  if author is not null then
    insert into notifications (user_id, kind, title, body)
    values (author, 'review_reply',
            'Developer replied to your review',
            left(new.body, 160));
  end if;
  return new;
end $$;

create trigger replies_notify
  after insert on review_replies
  for each row execute function notify_review_reply();

commit;
