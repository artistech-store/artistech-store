import { redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { SponsorshipForm } from "./sponsorship-form";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sponsorships" };

const AD_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Awaiting approval",
  active: "Active",
  paused: "Paused",
  ended: "Ended",
  rejected: "Rejected"
};

export default async function SponsorshipsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Store database not connected yet" body="Sponsorships activate with Supabase credentials." />
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: products }, { data: ads }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, status")
      .eq("developer_id", user.id)
      .in("status", ["published", "pending_review"])
      .order("name"),
    supabase
      .from("advertisements")
      .select("id, placement, status, impressions, clicks, created_at, product:products(name), campaign:sponsored_campaigns(name, budget_inr, starts_at, ends_at, status)")
      .order("created_at", { ascending: false })
  ]);

  const list = products ?? [];

  return (
    <div className="stack" style={{ marginTop: 24, gap: 26, maxWidth: 720 }}>
      <div>
        <h1 className="section-title">Sponsorships</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "60ch" }}>
          Promote a published product in a clearly labeled &quot;Sponsored&quot; slot.
          Every placement is reviewed by the ArtisTech team before it goes live,
          and sponsored items never mix into organic rankings. Billing activates
          with the payment integration - campaigns are free to prepare until then.
        </p>
      </div>

      <section aria-label="New sponsorship">
        <h2 className="section-title" style={{ marginBottom: 10 }}>Request a placement</h2>
        {list.length === 0 ? (
          <EmptyState title="Publish a product first" body="Sponsorships promote your published products." />
        ) : (
          <SponsorshipForm products={list.map((p) => ({ id: p.id, name: p.name, status: p.status }))} />
        )}
      </section>

      <section aria-label="My sponsorships">
        <h2 className="section-title" style={{ marginBottom: 10 }}>My sponsorships</h2>
        {(ads ?? []).length === 0 ? (
          <EmptyState title="No sponsorships yet" body="Your placement requests and their performance appear here." />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {(ads ?? []).map((a) => {
              const product = (a.product as unknown as { name: string } | null)?.name ?? "(product removed)";
              const campaign = a.campaign as unknown as {
                name: string; budget_inr: number; starts_at: string; ends_at: string; status: string;
              } | null;
              return (
                <div key={a.id} style={{
                  background: "var(--card)", border: "1px solid var(--line)",
                  borderRadius: 12, padding: "12px 14px"
                }}>
                  <strong>{product}</strong>
                  <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>
                    {" \u00b7 "}{campaign?.name}{" \u00b7 "}{a.placement} placement
                    {" \u00b7 "}{AD_STATUS_LABEL[a.status] ?? a.status}
                    {" \u00b7 "}Rs {campaign?.budget_inr ?? 0}
                    {" \u00b7 "}{new Date(campaign?.starts_at ?? "").toLocaleDateString()}
                    {" - "}{new Date(campaign?.ends_at ?? "").toLocaleDateString()}
                  </span>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                    {a.impressions} impressions{" \u00b7 "}{a.clicks} clicks
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
