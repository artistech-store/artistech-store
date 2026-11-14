-- Phase 10 security hardening (applied via Management API on 2026-11-14)
-- 1. Profiles are private: only self or admin may read the full row.
--    Reviewer names stay public through the column-limited view public_profiles.
-- 2. Trigger-only functions are not callable by clients: revoking EXECUTE from
--    public (the default grant) keeps triggers working while blocking direct calls.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.recalc_product_rating() from public;
revoke execute on function public.bump_download_count() from public;
revoke execute on function public.touch_updated_at() from public;
revoke execute on function public.write_audit(text,text,text,jsonb) from public;
revoke execute on function public.notify_product_status() from public;
revoke execute on function public.notify_new_review() from public;
revoke execute on function public.notify_review_reply() from public;
