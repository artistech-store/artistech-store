import { redirect, notFound } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { ManageProduct } from "./manage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Manage product" };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Store database not connected yet" body="Product management activates with Supabase credentials." />
      </div>
    );
  }
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // RLS scopes this to products the caller owns (or admin).
  const { data: product } = await supabase
    .from("products")
    .select("id, name, tagline, description, status, current_version, developer_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!product || product.developer_id !== user.id) notFound();

  const { data: versions } = await supabase
    .from("product_versions")
    .select("id, version, changelog, file_size, is_current, created_at")
    .eq("product_id", product.id)
    .order("created_at", { ascending: false });

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <h1 className="section-title">Manage: {product.name}</h1>
      <ManageProduct product={product} versions={versions ?? []} />
    </div>
  );
}
