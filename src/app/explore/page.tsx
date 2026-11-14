import { searchProducts, getCategories } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore",
  description: "Search and browse every published product on ArtisTech.Store."
};

export default async function ExplorePage({
  searchParams
}: {
  searchParams: { q?: string; category?: string; sort?: string; page?: string };
}) {
  const [categories, results] = await Promise.all([
    getCategories(),
    searchProducts({
      q: searchParams.q,
      category: searchParams.category,
      sort: (searchParams.sort as never) ?? "newest",
      page: Number(searchParams.page ?? 1) || 1
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(results.total / results.pageSize));

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <h1 className="section-title">Explore the marketplace</h1>

      <form action="/explore" method="get" role="search" className="stack" style={{ gap: 10 }}>
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search apps, games, tools and developers"
          aria-label="Search products"
          style={{
            width: "100%",
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 13,
            color: "var(--text)",
            padding: "12px 14px",
            fontSize: "0.95rem",
            fontFamily: "inherit"
          }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select name="category" defaultValue={searchParams.category ?? ""} aria-label="Category"
            style={selectStyle}>
            <option value="">All categories</option>
            {categories.categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
          <select name="sort" defaultValue={searchParams.sort ?? "newest"} aria-label="Sort by"
            style={selectStyle}>
            <option value="newest">Newest</option>
            <option value="downloads">Most downloaded</option>
            <option value="rating">Highest rated</option>
            <option value="updated">Recently updated</option>
            <option value="name">Alphabetical</option>
          </select>
          <button className="btn btn-gold" type="submit">Search</button>
        </div>
      </form>

      {!results.configured ? (
        <EmptyState
          title="Store database not connected yet"
          body="Search will query live ArtisTech.Store records as soon as Supabase credentials are configured (see .env.example)."
        />
      ) : results.products.length === 0 ? (
        <EmptyState
          title={results.total === 0 && !searchParams.q ? "No products published yet" : "No matches"}
          body={searchParams.q
            ? `Nothing published matches "${searchParams.q}" yet.`
            : "Products appear here the moment administrators approve the first submissions."}
        />
      ) : (
        <>
          <p style={{ color: "var(--text-faint)", fontSize: "0.85rem" }}>
            {results.total} product{results.total === 1 ? "" : "s"}
          </p>
          <div className="card-grid">
            {results.products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {totalPages > 1 && (
            <nav aria-label="Pagination" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <a key={i} className={i + 1 === results.page ? "btn btn-gold" : "btn btn-ghost"}
                  href={`/explore?q=${encodeURIComponent(searchParams.q ?? "")}&category=${searchParams.category ?? ""}&sort=${searchParams.sort ?? "newest"}&page=${i + 1}`}>
                  {i + 1}
                </a>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 11,
  color: "var(--text)",
  padding: "11px 13px",
  fontSize: "0.9rem",
  fontFamily: "inherit"
};
