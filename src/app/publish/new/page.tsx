import { redirect } from "next/navigation";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { PublishWizard } from "./wizard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Publish a product" };

export default async function PublishNewPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 24 }}>
        <EmptyState title="Store database not connected yet" body="Publishing activates with Supabase credentials." />
      </div>
    );
  }
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, slug, name, kind")
    .order("position");

  return (
    <div className="stack" style={{ marginTop: 24 }}>
      <h1 className="section-title">Publish a product</h1>
      <p style={{ color: "var(--text-muted)", fontSize: "0.92rem" }}>
        Free for developers. Your product is reviewed by an administrator
        before it goes live.
      </p>
      <PublishWizard categories={categories ?? []} />
    </div>
  );
}
