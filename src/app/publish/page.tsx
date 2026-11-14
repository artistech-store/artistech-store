import Link from "next/link";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publish",
  description: "Publish your app, game, tool or creative project on ArtisTech.Store - free for developers."
};

export default async function PublishPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="stack" style={{ marginTop: 32 }}>
        <h1 className="section-title">Publish your work</h1>
        <EmptyState
          title="Publishing activates with the store database"
          body="The publishing portal (developer profiles, product submissions, moderation) connects to Supabase. Credentials are pending - see .env.example."
        />
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="stack" style={{ marginTop: 32, maxWidth: 520 }}>
        <h1 className="section-title">Publish your work</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Publishing on ArtisTech.Store is free. Sign in, create your developer
          profile, and submit your product for review.
        </p>
        <p>
          <Link className="btn btn-gold" href="/sign-in">Sign in to continue</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ marginTop: 32, maxWidth: 520 }}>
      <h1 className="section-title">Developer publishing</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Publish a new product, or manage the ones you already have.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn btn-gold" href="/publish/new">Publish new product</Link>
        <Link className="btn btn-ghost" href="/dashboard/developer">My products</Link>
      </div>
    </div>
  );
}
