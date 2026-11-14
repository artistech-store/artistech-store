import Link from "next/link";
import { getCategories } from "@/lib/data";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse every product category on ArtisTech.Store."
};

export default async function CategoriesPage() {
  const { configured, categories } = await getCategories();

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <h1 className="section-title">Categories</h1>
      {!configured ? (
        <EmptyState
          title="Store database not connected yet"
          body="Categories load from the live database once Supabase credentials are configured."
        />
      ) : categories.length === 0 ? (
        <EmptyState title="No categories yet" body="Administrators can create categories from the admin dashboard." />
      ) : (
        <div className="card-grid">
          {categories.map((c) => (
            <Link key={c.id} href={`/explore?category=${c.slug}`} className="product-card">
              <div className="product-name">{c.name}</div>
              <div className="product-meta"><span>Browse</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
