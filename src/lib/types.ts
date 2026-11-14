// Shared domain types for ArtisTech.Store.
// These mirror the Supabase schema in supabase/migrations/202611140001_init.sql.

export type UserRole = "user" | "developer" | "admin";

export type ProductStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "published"
  | "rejected"
  | "suspended";

export type ProductKind =
  | "android_app"
  | "windows_software"
  | "macos_app"
  | "linux_app"
  | "web_app"
  | "mobile_game"
  | "pc_game"
  | "browser_game"
  | "ai_tool"
  | "developer_tool"
  | "open_source"
  | "ui_kit"
  | "design_resource"
  | "creative_project"
  | "educational"
  | "productivity"
  | "other";

export interface Profile {
  id: string; // uuid, references auth.users
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_suspended: boolean;
  created_at: string;
}

export interface DeveloperProfile {
  id: string; // uuid, references profiles
  slug: string;
  display_name: string;
  bio: string | null;
  website: string | null;
  verified: boolean;
  created_at: string;
}

export interface ProductCategory {
  id: string;
  slug: string;
  name: string;
  kind: ProductKind | null;
  position: number;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  icon_url: string | null;
  developer_name: string;
  developer_slug: string;
  category_name: string;
  price_cents: number;
  avg_rating: number | null; // null = not enough ratings yet
  rating_count: number;
  download_count: number;
  published_at: string;
  updated_at: string;
}

export interface Product extends ProductSummary {
  description: string;
  cover_url: string | null;
  current_version: string | null;
  status: ProductStatus;
  kind: ProductKind;
  platforms: string[];
  languages: string[];
  license: string | null;
  min_requirements: string | null;
  privacy_policy_url: string | null;
  external_url: string | null;
}
