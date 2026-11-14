"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ProductOption {
  id: string;
  name: string;
  status: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--line)",
  borderRadius: 11, color: "var(--text)", padding: "11px 13px", fontFamily: "inherit"
};

export function SponsorshipForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [placement, setPlacement] = useState("home");
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("500");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const budgetNum = Math.floor(Number(budget));
    if (!productId) { setErr("Choose a product."); return; }
    if (!name.trim()) { setErr("Give the campaign a name."); return; }
    if (!Number.isFinite(budgetNum) || budgetNum < 0) { setErr("Budget must be a whole rupee amount."); return; }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      setErr("Pick a valid start and end date.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: campaign, error: cErr } = await supabase
        .from("sponsored_campaigns")
        .insert({
          name: name.trim(),
          budget_inr: budgetNum,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          status: "active"
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      const { error: aErr } = await supabase.from("advertisements").insert({
        campaign_id: campaign.id,
        product_id: productId,
        placement,
        status: "pending_approval"
      });
      if (aErr) throw aErr;

      setDone(true);
      router.refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not submit the request.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="empty-state">
        <strong>Request submitted</strong>
        <p>Your placement is queued for review by the ArtisTech team. It goes live once approved.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 12, maxWidth: 480 }}>
      <label style={{ display: "grid", gap: 6, fontSize: "0.85rem" }}>
        Product
        <select value={productId} onChange={(e) => setProductId(e.target.value)} style={inputStyle}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}{p.status !== "published" ? " (not published yet)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: "0.85rem" }}>
        Placement
        <select value={placement} onChange={(e) => setPlacement(e.target.value)} style={inputStyle}>
          <option value="home">Homepage</option>
          <option value="category">Category pages</option>
          <option value="search">Search results</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: "0.85rem" }}>
        Campaign name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Diwali launch push" style={inputStyle} maxLength={80} />
      </label>
      <label style={{ display: "grid", gap: 6, fontSize: "0.85rem" }}>
        Budget (Rs)
        <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="numeric" style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 6, fontSize: "0.85rem", flex: 1, minWidth: 160 }}>
          Starts
          <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: "0.85rem", flex: 1, minWidth: 160 }}>
          Ends
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={inputStyle} />
        </label>
      </div>
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem" }}>{err}</p>}
      <button className="btn btn-gold" disabled={busy} type="submit">
        {busy ? "Submitting..." : "Submit for review"}
      </button>
    </form>
  );
}
