import type { MetadataRoute } from "next";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artistech.store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/explore", "/categories", "/developers", "/about", "/help", "/privacy", "/terms", "/guidelines"].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.6
    })
  );

  if (!isSupabaseConfigured()) return staticRoutes;

  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1000);

  const productRoutes = (products ?? []).map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8
  }));

  return [...staticRoutes, ...productRoutes];
}
