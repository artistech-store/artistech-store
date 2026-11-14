import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { ProductActions } from "./product-actions";
import { ReviewList } from "./review-list";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Params {
  params: { slug: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Product" };
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select("name, tagline, icon_url")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return { title: "Product not found" };
  return {
    title: data.name,
    description: data.tagline ?? undefined,
    openGraph: data.icon_url ? { images: [data.icon_url] } : undefined
  };
}

export default async function ProductPage({ params }: Params) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState
          title="Store database not connected yet"
          body="Product pages read live records once Supabase credentials are configured."
        />
      </div>
    );
  }

  const supabase = createClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      `*, developer:developer_profiles!inner(slug, display_name, verified),
           category:product_categories(name, slug),
           media:product_media(kind, url, position),
           versions:product_versions(id, version, changelog, file_size, is_current, created_at)`
    )
    .eq("slug", params.slug)
    .eq("status", "published")
    .order("position", { referencedTable: "product_media", ascending: true })
    .maybeSingle();

  if (!product) notFound();

  const developer = product.developer as unknown as {
    slug: string;
    display_name: string;
    verified: boolean;
  };
  const category = product.category as unknown as { name: string; slug: string } | null;
  const media = (product.media as unknown as { kind: string; url: string }[]) ?? [];
  const versions =
    (product.versions as unknown as {
      id: string; version: string; changelog: string; file_size: number | null;
      is_current: boolean; created_at: string;
    }[]) ?? [];
  const screenshots = media.filter((m) => m.kind === "screenshot");
  const currentVersion = versions.find((v) => v.is_current) ?? versions[0];

  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, body, is_verified_download, created_at, public_profiles!reviews_user_id_fkey(username, display_name)")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="stack" style={{ marginTop: 24, gap: 20 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        {product.icon_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.icon_url} alt="" width={84} height={84}
            style={{ width: 84, height: 84, borderRadius: 20, border: "1px solid var(--line)" }} />
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>{product.name}</h1>
          <p style={{ marginTop: 4 }}>
            <Link href={`/developers/${developer.slug}`} style={{ fontWeight: 600 }}>
              {developer.display_name}
            </Link>
            {developer.verified && <span title="Verified developer" style={{ color: "var(--accent)" }}> &#10003;</span>}
          </p>
          <p style={{ color: "var(--text-faint)", fontSize: "0.85rem", marginTop: 4 }}>
            {category?.name}
            {" \u00b7 "}
            {product.price_cents === 0 ? "Free" : `Paid`}
            {" \u00b7 "}
            {product.avg_rating != null
              ? `${product.avg_rating} (${product.rating_count} rating${product.rating_count === 1 ? "" : "s"})`
              : "Not enough ratings yet"}
            {" \u00b7 "}
            {product.download_count} downloads
          </p>
        </div>
      </div>

      <ProductActions
        productId={product.id}
        developerId={product.developer_id}
        productName={product.name}
        priceCents={product.price_cents}
        hasFile={Boolean(currentVersion)}
      />

      {screenshots.length > 0 && (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
          {screenshots.map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={m.url} alt={`${product.name} screenshot ${i + 1}`} loading="lazy"
              style={{ height: 280, borderRadius: 14, border: "1px solid var(--line)" }} />
          ))}
        </div>
      )}

      <section aria-label="About">
        <h2 className="section-title" style={{ marginBottom: 8 }}>About this product</h2>
        <p style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
          {product.description}
        </p>
      </section>

      {currentVersion?.changelog && (
        <section aria-label="What's new">
          <h2 className="section-title" style={{ marginBottom: 8 }}>What&apos;s new</h2>
          <p style={{ color: "var(--text-faint)", fontSize: "0.85rem", marginBottom: 6 }}>
            Version {currentVersion.version}
          </p>
          <p style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>{currentVersion.changelog}</p>
        </section>
      )}

      <section aria-label="Details">
        <h2 className="section-title" style={{ marginBottom: 8 }}>Details</h2>
        <dl style={{ fontSize: "0.9rem" }}>
          {[
            ["Developer", developer.display_name],
            ["Category", category?.name ?? "Uncategorized"],
            ["Platforms", (product.platforms as string[]).join(", ") || "-"],
            ["Languages", (product.languages as string[]).join(", ") || "-"],
            ["Current version", product.current_version ?? currentVersion?.version ?? "-"],
            ["License", product.license ?? "-"],
            ["Published", product.published_at ? new Date(product.published_at).toLocaleDateString() : "-"],
            ["Updated", new Date(product.updated_at).toLocaleDateString()]
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
              <dt style={{ color: "var(--text-faint)" }}>{k}</dt>
              <dd style={{ fontWeight: 600, textAlign: "right" }}>{v}</dd>
            </div>
          ))}
        </dl>
        {product.min_requirements && (
          <p style={{ marginTop: 10, color: "var(--text-muted)", fontSize: "0.88rem" }}>
            <strong>Requirements:</strong> {product.min_requirements}
          </p>
        )}
        {product.privacy_policy_url && (
          <p style={{ marginTop: 8, fontSize: "0.88rem" }}>
            <a href={product.privacy_policy_url} rel="noopener noreferrer">Privacy policy</a>
          </p>
        )}
      </section>

      <section aria-label="Ratings and reviews">
        <h2 className="section-title" style={{ marginBottom: 8 }}>Ratings &amp; reviews</h2>
        <ReviewList
          productId={product.id}
          reviews={(reviews ?? []).map((r) => ({
            id: r.id,
            rating: r.rating,
            body: r.body,
            verified: r.is_verified_download,
            created_at: r.created_at,
            author:
              (r.public_profiles as unknown as { display_name: string | null; username: string } | null)
                ?.display_name ??
              (r.public_profiles as unknown as { username: string } | null)?.username ??
              "User"
          }))}
        />
      </section>
    </div>
  );
}
