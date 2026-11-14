import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { ProductCard } from "@/components/product-card";
import { FollowButton } from "./follow-button";
import type { Metadata } from "next";
import type { ProductSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Developer" };
  const supabase = createClient();
  const { data } = await supabase
    .from("developer_profiles")
    .select("display_name, bio")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!data) return { title: "Developer not found" };
  return { title: data.display_name, description: data.bio ?? undefined };
}

export default async function DeveloperProfilePage({ params }: { params: { slug: string } }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Store database not connected yet" body="Developer profiles read live records once Supabase credentials are configured." />
      </div>
    );
  }

  const supabase = createClient();
  const { data: dev } = await supabase
    .from("developer_profiles")
    .select("id, slug, display_name, bio, website, verified, created_at")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!dev) notFound();

  const { data: products } = await supabase
    .from("products")
    .select(
      `id, slug, name, tagline, icon_url, price_cents, avg_rating, rating_count,
       download_count, published_at, updated_at,
       category:product_categories!inner(name)`
    )
    .eq("developer_id", dev.id)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const list: ProductSummary[] = (products ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    icon_url: row.icon_url,
    price_cents: row.price_cents,
    avg_rating: row.avg_rating,
    rating_count: row.rating_count,
    download_count: row.download_count,
    published_at: row.published_at,
    updated_at: row.updated_at,
    developer_name: dev.display_name,
    developer_slug: dev.slug,
    category_name: (row.category as unknown as { name: string } | null)?.name ?? "Uncategorized"
  }));

  const totalDownloads = list.reduce((a, p) => a + p.download_count, 0);

  return (
    <div className="stack" style={{ marginTop: 24, gap: 24 }}>
      <header className="stack" style={{ gap: 10 }}>
        <h1 className="section-title" style={{ fontSize: "1.5rem" }}>
          {dev.display_name}
          {dev.verified && <span title="Verified developer" style={{ color: "var(--accent)" }}> &#10003;</span>}
        </h1>
        {dev.bio && <p style={{ color: "var(--text-muted)", maxWidth: 640 }}>{dev.bio}</p>}
        <p style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
          {list.length} product{list.length === 1 ? "" : "s"} &middot; {totalDownloads} downloads
          &middot; on ArtisTech.Store since {new Date(dev.created_at).toLocaleDateString()}
          {dev.website && (
            <>
              {" \u00b7 "}<a href={dev.website} rel="noopener noreferrer">{dev.website.replace(/^https?:\/\//, "")}</a>
            </>
          )}
        </p>
        <div><FollowButton developerId={dev.id} /></div>
      </header>

      <section aria-label="Products by this developer">
        <h2 className="section-title" style={{ marginBottom: 12 }}>Products</h2>
        {list.length === 0 ? (
          <EmptyState title="Nothing published yet" body="This developer's approved products will appear here." />
        ) : (
          <div className="card-grid">
            {list.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
