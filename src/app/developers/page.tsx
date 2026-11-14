import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Developers",
  description: "Meet the developers publishing on ArtisTech.Store."
};

export default async function DevelopersPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <h1 className="section-title">Developers</h1>
        <EmptyState
          title="Store database not connected yet"
          body="Developer profiles load from the live database once Supabase credentials are configured."
        />
      </div>
    );
  }

  const supabase = createClient();
  const { data: devs } = await supabase
    .from("developer_profiles")
    .select("id, slug, display_name, bio, verified")
    .order("created_at", { ascending: false })
    .limit(48);

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <h1 className="section-title">Developers</h1>
      {!devs || devs.length === 0 ? (
        <EmptyState
          title="No developer profiles yet"
          body="Be the first: sign in, create your developer profile, and publish."
        />
      ) : (
        <div className="card-grid">
          {devs.map((d) => (
            <Link key={d.id} href={`/developers/${d.slug}`} className="product-card">
              <div className="product-name">
                {d.display_name}
                {d.verified && <span title="Verified developer" style={{ color: "var(--accent)" }}> &#10003;</span>}
              </div>
              {d.bio && <p className="product-tagline">{d.bio}</p>}
              <div className="product-meta"><span>Developer</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
