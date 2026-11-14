import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Store database not connected yet" body="Your dashboard activates with Supabase credentials." />
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [profile, wishlist, downloads, reviews, follows, notifications] = await Promise.all([
    supabase.from("profiles").select("username, display_name, role, created_at").eq("id", user.id).single(),
    supabase.from("wishlists").select("product:products(id, slug, name, icon_url, developer:developer_profiles(display_name))").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("product_downloads").select("created_at, product:products(slug, name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("reviews").select("id, rating, created_at, product:products(slug, name)").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("developer_follows").select("developer:developer_profiles(slug, display_name, verified)").eq("user_id", user.id),
    supabase.from("notifications").select("id, title, body, link, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15)
  ]);

  const p = profile.data;

  return (
    <div className="stack" style={{ marginTop: 24, gap: 26 }}>
      <header>
        <h1 className="section-title">{p?.display_name || p?.username || "Your dashboard"}</h1>
        <p style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
          @{p?.username} &middot; {p?.role} &middot; joined {p?.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
        </p>
        {p?.role !== "developer" && p?.role !== "admin" && (
          <p style={{ marginTop: 8 }}>
            <Link className="btn btn-gold" href="/publish">Become a developer - publish free</Link>
          </p>
        )}
        {(p?.role === "developer" || p?.role === "admin") && (
          <p style={{ marginTop: 8 }}>
            <Link className="btn btn-gold" href="/dashboard/developer">Developer dashboard</Link>
          </p>
        )}
      </header>

      <section aria-label="Notifications">
        <h2 className="section-title" style={{ marginBottom: 10 }}>Notifications</h2>
        {!notifications.data?.length ? (
          <EmptyState title="All caught up" body="Account and product activity shows up here." />
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {notifications.data.map((n) => (
              <div key={n.id} style={{
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
                padding: "11px 14px", opacity: n.read_at ? 0.7 : 1
              }}>
                <strong style={{ fontSize: "0.9rem" }}>{n.title}</strong>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{n.body}</p>
                <time style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>
                  {new Date(n.created_at).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Wishlist">
        <h2 className="section-title" style={{ marginBottom: 10 }}>Wishlist</h2>
        {!wishlist.data?.length ? (
          <EmptyState title="Wishlist is empty" body="Tap Wishlist on any product page to save it here." />
        ) : (
          <div className="card-grid">
            {wishlist.data.map((w) => {
              const prod = w.product as unknown as {
                id: string; slug: string; name: string; icon_url: string | null;
                developer: { display_name: string } | null;
              } | null;
              if (!prod) return null;
              return (
                <Link key={prod.id} href={`/products/${prod.slug}`} className="product-card">
                  <div className="product-name">{prod.name}</div>
                  <div className="product-dev">{prod.developer?.display_name}</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Download history">
        <h2 className="section-title" style={{ marginBottom: 10 }}>Download history</h2>
        {!downloads.data?.length ? (
          <EmptyState title="No downloads yet" body="Products you download appear here." />
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {downloads.data.map((d, i) => {
              const prod = d.product as unknown as { slug: string; name: string } | null;
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  {prod ? <Link href={`/products/${prod.slug}`}>{prod.name}</Link> : <span>Removed product</span>}
                  <time style={{ color: "var(--text-faint)" }}>{new Date(d.created_at).toLocaleDateString()}</time>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="My reviews">
        <h2 className="section-title" style={{ marginBottom: 10 }}>My reviews</h2>
        {!reviews.data?.length ? (
          <EmptyState title="No reviews yet" body="Your ratings and reviews appear here." />
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {reviews.data.map((r) => {
              const prod = r.product as unknown as { slug: string; name: string } | null;
              return (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                  <span>{prod ? <Link href={`/products/${prod.slug}`}>{prod.name}</Link> : "Removed product"}</span>
                  <span style={{ color: "var(--accent)" }}>{"\u2605".repeat(r.rating)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Followed developers">
        <h2 className="section-title" style={{ marginBottom: 10 }}>Followed developers</h2>
        {!follows.data?.length ? (
          <EmptyState title="Not following anyone yet" body="Follow developers from their product pages." />
        ) : (
          <div className="card-grid">
            {follows.data.map((f, i) => {
              const dev = f.developer as unknown as { slug: string; display_name: string; verified: boolean } | null;
              if (!dev) return null;
              return (
                <Link key={i} href={`/developers/${dev.slug}`} className="product-card">
                  <div className="product-name">{dev.display_name}{dev.verified && " \u2713"}</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
