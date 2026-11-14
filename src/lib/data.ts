import type { ProductSummary, ProductCategory } from "./types";
import { isSupabaseConfigured, createClient } from "./supabase/server";

/**
 * Homepage and discovery queries.
 *
 * Every section reads real database records. When Supabase is not configured
 * yet (fresh clone, credentials pending) or a section simply has no rows,
 * the caller renders the spec-mandated empty state. Nothing here fabricates
 * listings, ratings, or download counts.
 */

export interface HomeData {
  configured: boolean;
  featured: ProductSummary[];
  trending: ProductSummary[];
  games: ProductSummary[];
  aiAndProductivity: ProductSummary[];
  recentlyPublished: ProductSummary[];
  recentlyUpdated: ProductSummary[];
  openSource: ProductSummary[];
  categories: ProductCategory[];
}

const SUMMARY_SELECT = `
  id, slug, name, tagline, icon_url, price_cents,
  avg_rating, rating_count, download_count, published_at, updated_at,
  developer:developer_profiles!inner(display_name, slug),
  category:product_categories!inner(name)
`;

interface RawRow extends Record<string, unknown> {
  developer: { display_name: string; slug: string } | null;
  category: { name: string } | null;
}

function toSummary(row: RawRow): ProductSummary {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    tagline: (row.tagline as string) ?? null,
    icon_url: (row.icon_url as string) ?? null,
    price_cents: Number(row.price_cents ?? 0),
    avg_rating: (row.avg_rating as number) ?? null,
    rating_count: Number(row.rating_count ?? 0),
    download_count: Number(row.download_count ?? 0),
    published_at: String(row.published_at),
    updated_at: String(row.updated_at),
    developer_name: row.developer?.display_name ?? "Unknown developer",
    developer_slug: row.developer?.slug ?? "",
    category_name: row.category?.name ?? "Uncategorized"
  };
}

export interface SearchFilters {
  q?: string;
  category?: string;
  kind?: string;
  sort?: "popular" | "downloads" | "rating" | "newest" | "updated" | "name";
  page?: number;
}

const PAGE_SIZE = 24;

export async function searchProducts(filters: SearchFilters): Promise<{
  configured: boolean;
  products: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  if (!isSupabaseConfigured()) {
    return { configured: false, products: [], total: 0, page, pageSize: PAGE_SIZE };
  }
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select(SUMMARY_SELECT, { count: "exact" })
    .eq("status", "published");

  if (filters.q) {
    // Full-text search over name/tagline/description (see products_search_idx)
    query = query.textSearch("name", filters.q.trim(), { type: "websearch" })
      .or(`tagline.ilike.%${filters.q.trim()}%,description.ilike.%${filters.q.trim()}%`);
  }
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.category) {
    query = query.eq("category.slug", filters.category);
  }

  switch (filters.sort) {
    case "popular":
    case "downloads":
      query = query.order("download_count", { ascending: false });
      break;
    case "rating":
      query = query.order("avg_rating", { ascending: false, nullsFirst: false });
      break;
    case "updated":
      query = query.order("updated_at", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("published_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) {
    console.error("searchProducts failed:", error.message);
    return { configured: true, products: [], total: 0, page, pageSize: PAGE_SIZE };
  }
  return {
    configured: true,
    products: ((data ?? []) as unknown as RawRow[]).map(toSummary),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE
  };
}

export async function getCategories(): Promise<{
  configured: boolean;
  categories: ProductCategory[];
}> {
  if (!isSupabaseConfigured()) return { configured: false, categories: [] };
  const supabase = createClient();
  const { data } = await supabase
    .from("product_categories")
    .select("id, slug, name, kind, position")
    .order("position");
  return { configured: true, categories: (data ?? []) as ProductCategory[] };
}

export interface SponsoredItem {
  adId: string;
  productId: string;
  slug: string;
  name: string;
  tagline: string | null;
  iconUrl: string | null;
  developerName: string;
}

/** Live sponsored placements for a slot ("home" | "category" | "search"). */
export async function getSponsored(placement: string): Promise<SponsoredItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_live_ads", { p_placement: placement });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    adId: String(r.ad_id),
    productId: String(r.product_id),
    slug: String(r.slug),
    name: String(r.name),
    tagline: (r.tagline as string) ?? null,
    iconUrl: (r.icon_url as string) ?? null,
    developerName: String(r.developer_name)
  }));
}

export async function getHomeData(): Promise<HomeData> {
  const empty: HomeData = {
    configured: isSupabaseConfigured(),
    featured: [],
    trending: [],
    games: [],
    aiAndProductivity: [],
    recentlyPublished: [],
    recentlyUpdated: [],
    openSource: [],
    categories: []
  };
  if (!empty.configured) return empty;

  const supabase = createClient();

  const base = () =>
    supabase.from("products").select(SUMMARY_SELECT).eq("status", "published");

  const [
    featured,
    trending,
    games,
    aiProd,
    recent,
    updated,
    openSource,
    categories
  ] = await Promise.all([
    base().eq("is_featured", true).order("published_at", { ascending: false }).limit(8),
    base().order("download_count", { ascending: false }).limit(8),
    base().in("kind", ["mobile_game", "pc_game", "browser_game"]).order("download_count", { ascending: false }).limit(8),
    base().in("kind", ["ai_tool", "productivity"]).order("published_at", { ascending: false }).limit(8),
    base().order("published_at", { ascending: false }).limit(8),
    base().order("updated_at", { ascending: false }).limit(8),
    base().eq("kind", "open_source").order("published_at", { ascending: false }).limit(8),
    supabase.from("product_categories").select("id, slug, name, kind, position").order("position")
  ]);

  return {
    configured: true,
    featured: ((featured.data ?? []) as unknown as RawRow[]).map(toSummary),
    trending: ((trending.data ?? []) as unknown as RawRow[]).map(toSummary),
    games: ((games.data ?? []) as unknown as RawRow[]).map(toSummary),
    aiAndProductivity: ((aiProd.data ?? []) as unknown as RawRow[]).map(toSummary),
    recentlyPublished: ((recent.data ?? []) as unknown as RawRow[]).map(toSummary),
    recentlyUpdated: ((updated.data ?? []) as unknown as RawRow[]).map(toSummary),
    openSource: ((openSource.data ?? []) as unknown as RawRow[]).map(toSummary),
    categories: (categories.data ?? []) as ProductCategory[]
  };
}
