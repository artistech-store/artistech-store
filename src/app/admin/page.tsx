import { redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { AdminPanel } from "./panel";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Store database not connected yet" body="The admin dashboard activates with Supabase credentials." />
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Server-side role check - never trust client claims.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Administrators only" body="This area is restricted to ArtisTech.Store administrators." />
      </div>
    );
  }

  const [pending, reports, users, categories, audit, ads] = await Promise.all([
    supabase
      .from("products")
      .select("id, slug, name, kind, status, created_at, developer:developer_profiles(display_name)")
      .in("status", ["pending_review", "changes_requested"])
      .order("created_at"),
    supabase
      .from("reports")
      .select("id, reason, details, status, created_at, product:products(name)")
      .eq("status", "open")
      .order("created_at"),
    supabase.from("profiles").select("id, username, display_name, role, is_suspended, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("product_categories").select("id, slug, name, position").order("position"),
    supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(30),
    supabase
      .from("advertisements")
      .select("id, placement, status, impressions, clicks, product:products(name), campaign:sponsored_campaigns(name, budget_inr, starts_at, ends_at)")
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <h1 className="section-title">Administration</h1>
      <AdminPanel
        pending={(pending.data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          kind: p.kind,
          status: p.status,
          created_at: p.created_at,
          developer: (p.developer as unknown as { display_name: string } | null)?.display_name ?? "?"
        }))}
        reports={(reports.data ?? []).map((r) => ({
          id: r.id,
          reason: r.reason,
          details: r.details,
          created_at: r.created_at,
          product: (r.product as unknown as { name: string } | null)?.name ?? "(product removed)"
        }))}
        users={users.data ?? []}
        categories={categories.data ?? []}
        audit={audit.data ?? []}
        ads={(ads.data ?? []).map((a) => ({
          id: a.id,
          placement: a.placement,
          status: a.status,
          impressions: a.impressions,
          clicks: a.clicks,
          product: (a.product as unknown as { name: string } | null)?.name ?? "(product removed)",
          campaign: (a.campaign as unknown as { name: string; budget_inr: number; starts_at: string; ends_at: string } | null)?.name ?? "?",
          budget: (a.campaign as unknown as { budget_inr: number } | null)?.budget_inr ?? 0,
          starts_at: (a.campaign as unknown as { starts_at: string } | null)?.starts_at ?? "",
          ends_at: (a.campaign as unknown as { ends_at: string } | null)?.ends_at ?? ""
        }))}
      />
    </div>
  );
}
