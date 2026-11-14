import Link from "next/link";
import { getHomeData, getSponsored } from "@/lib/data";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import { SponsoredCard } from "@/components/sponsored-card";
import type { ProductSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

function Section({
  title,
  href,
  products,
  emptyTitle,
  emptyBody
}: {
  title: string;
  href: string;
  products: ProductSummary[];
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <section className="section" aria-label={title}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        <Link className="section-link" href={href}>
          See all
        </Link>
      </div>
      {products.length > 0 ? (
        <div className="card-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState title={emptyTitle} body={emptyBody} />
      )}
    </section>
  );
}

export default async function HomePage() {
  const [data, sponsored] = await Promise.all([getHomeData(), getSponsored("home")]);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">Build. Collaborate. Publish.</div>
          <h1>Discover. Create. Share.</h1>
          <p>
            Explore applications, games, tools, and creative projects. Discover
            something new or publish your own work with ArtisTech.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-gold" href="/explore">
              Explore Marketplace
            </Link>
            <Link className="btn btn-ghost" href="/publish">
              Start Publishing
            </Link>
          </div>
        </div>
      </section>

      {!data.configured && (
        <section className="section">
          <EmptyState
            title="Store database not connected yet"
            body="This deployment is waiting on its Supabase credentials (see .env.example). Once connected, every section below shows live records - nothing here is hardcoded."
          />
        </section>
      )}

      {sponsored.length > 0 && (
        <section className="section" aria-label="Sponsored">
          <div className="section-head">
            <h2 className="section-title">Sponsored</h2>
          </div>
          <div className="card-grid">
            {sponsored.map((s) => (
              <SponsoredCard key={s.adId} item={s} />
            ))}
          </div>
        </section>
      )}

      <Section
        title="Featured Applications"
        href="/featured"
        products={data.featured}
        emptyTitle="Nothing featured yet"
        emptyBody="Featured applications are hand-picked by ArtisTech administrators from published products."
      />
      <Section
        title="Trending Products"
        href="/trending"
        products={data.trending}
        emptyTitle="No trending products yet"
        emptyBody="Trending ranks published products by genuine download activity."
      />
      <Section
        title="Popular Games"
        href="/categories/games"
        products={data.games}
        emptyTitle="No games published yet"
        emptyBody="Mobile, PC and browser games appear here once developers publish them."
      />
      <Section
        title="AI & Productivity Tools"
        href="/categories/ai-tools"
        products={data.aiAndProductivity}
        emptyTitle="No AI or productivity tools yet"
        emptyBody="ArtisTech AI and other tools will appear here once published."
      />
      <Section
        title="Recently Published"
        href="/new"
        products={data.recentlyPublished}
        emptyTitle="No products yet"
        emptyBody="The newest approved products on ArtisTech.Store appear here."
      />
      <Section
        title="Recently Updated"
        href="/updated"
        products={data.recentlyUpdated}
        emptyTitle="No updates yet"
        emptyBody="Products with recent verified version updates appear here."
      />
      <Section
        title="Open-Source Projects"
        href="/categories/open-source"
        products={data.openSource}
        emptyTitle="No open-source projects yet"
        emptyBody="Open-source projects shared by the community appear here."
      />
    </>
  );
}
