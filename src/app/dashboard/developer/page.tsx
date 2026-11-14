import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Developer dashboard" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  published: "Published",
  rejected: "Rejected",
  suspended: "Suspended"
};

export default async function DeveloperDashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Store database not connected yet" body="The developer dashboard activates with Supabase credentials." />
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: dev } = await supabase
    .from("developer_profiles")
    .select("id, slug, display_name, verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!dev) {
    return (
      <div className="stack" style={{ marginTop: 32, maxWidth: 520 }}>
        <h1 className="section-title">Create your developer profile</h1>
        <p style={{ color: "var(--text-muted)" }}>
          One step before publishing: pick the public name users will see on
          your products.
        </p>
        <p><Link className="btn btn-gold" href="/publish">Create developer profile</Link></p>
      </div>
    );
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, slug, name, status, download_count, avg_rating, rating_count, updated_at")
    .eq("developer_id", dev.id)
    .order("updated_at", { ascending: false });

  const list = products ?? [];
  const totals = {
    published: list.filter((x) => x.status === "published").length,
    downloads: list.reduce((a, x) => a + (x.download_count ?? 0), 0),
    ratings: list.reduce((a, x) => a + (x.rating_count ?? 0), 0),
    pending: list.filter((x) => x.status === "pending_review").length
  };

  return (
    <div className="stack" style={{ marginTop: 24, gap: 26 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 className="section-title">{dev.display_name}</h1>
          <p style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
            Developer {dev.verified && "\u00b7 Verified \u2713"}
          </p>
        </div>
        <Link className="btn btn-gold" href="/publish/new">Publish new product</Link>
      </header>

      <section aria-label="Overview" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          ["Published", totals.published],
          ["Total downloads", totals.downloads],
          ["Ratings received", totals.ratings],
          ["Pending review", totals.pending]
        ].map(([label, value]) => (
          <div key={label} style={{
            flex: "1 1 140px", background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: 14, padding: "14px 16px", textAlign: "center"
          }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </section>

      <section aria-label="My products">
        <h2 className="section-title" style={{ marginBottom: 10 }}>My products</h2>
        {list.length === 0 ? (
          <EmptyState title="No products yet" body="Your published, draft and submitted products appear here." />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {list.map((x) => (
              <div key={x.id} style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                background: "var(--card)", border: "1px solid var(--line)",
                borderRadius: 12, padding: "12px 14px"
              }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  {x.status === "published"
                    ? <Link href={`/products/${x.slug}`} style={{ fontWeight: 700 }}>{x.name}</Link>
                    : <strong>{x.name}</strong>}
                  <div style={{ fontSize: "0.78rem", color: "var(--text-faint)" }}>
                    {x.download_count} downloads
                    {x.avg_rating != null && ` \u00b7 \u2605${x.avg_rating} (${x.rating_count})`}
                    {" \u00b7 updated "}{new Date(x.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="product-meta"><span>{STATUS_LABEL[x.status] ?? x.status}</span></span>
                <Link className="btn btn-ghost" href={`/publish/edit/${x.id}`}>Manage</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
