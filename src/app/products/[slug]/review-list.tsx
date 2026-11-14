"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/empty-state";

interface Review {
  id: string;
  rating: number;
  body: string;
  verified: boolean;
  created_at: string;
  author: string;
}

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5 stars`} style={{ color: "var(--accent)", letterSpacing: 2 }}>
      {"\u2605".repeat(n)}
      <span style={{ color: "var(--text-faint)" }}>{"\u2605".repeat(5 - n)}</span>
    </span>
  );
}

export function ReviewList({ productId, reviews }: { productId: string; reviews: Review[] }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setErr("Pick a star rating first.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/sign-in";
        return;
      }
      // One review per user per product - enforced by a unique constraint;
      // upsert lets the author edit their own review.
      const { error } = await supabase.from("reviews").upsert(
        { product_id: productId, user_id: auth.user.id, rating, body },
        { onConflict: "product_id,user_id" }
      );
      if (error) throw error;
      setMsg("Your review is live.");
      setBody("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 14 }}>
      <form onSubmit={submit} className="stack" style={{ gap: 10 }} aria-label="Write a review">
        <div style={{ display: "flex", gap: 6 }} role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem",
                color: n <= rating ? "var(--accent)" : "var(--text-faint)"
              }}>
              {"\u2605"}
            </button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000}
          placeholder="Share your experience (optional)" rows={3}
          style={{
            background: "var(--card)", border: "1px solid var(--line)", borderRadius: 11,
            color: "var(--text)", padding: "12px 13px", fontSize: "0.92rem",
            fontFamily: "inherit", width: "100%", resize: "vertical"
          }} />
        {err && <p role="alert" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{err}</p>}
        {msg && <p role="status" style={{ color: "var(--ok)", fontSize: "0.85rem" }}>{msg}</p>}
        <div>
          <button className="btn btn-ghost" type="submit" disabled={busy}>
            {busy ? "Posting..." : "Post review"}
          </button>
        </div>
      </form>

      {reviews.length === 0 ? (
        <EmptyState title="No reviews yet" body="Ratings and written reviews from real users appear here." />
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          {reviews.map((r) => (
            <article key={r.id} style={{
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: 14, padding: "14px 16px"
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <strong>{r.author}</strong>
                <Stars n={r.rating} />
                {r.verified && (
                  <span style={{ fontSize: "0.72rem", color: "var(--ok)", fontWeight: 700 }}>
                    Verified download
                  </span>
                )}
                <time style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--text-faint)" }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </time>
              </div>
              {r.body && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: 6 }}>{r.body}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
