"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Product actions: download, wishlist, share, follow developer, report.
 * All writes go through Supabase with Row Level Security; downloads are
 * authorized by the server route /api/download/[productId], which returns a
 * short-lived signed URL for the private storage bucket.
 */
export function ProductActions({
  productId,
  developerId,
  productName,
  priceCents,
  hasFile
}: {
  productId: string;
  developerId: string;
  productName: string;
  priceCents: number;
  hasFile: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function fail(e: unknown) {
    setErr(e instanceof Error ? e.message : "Something went wrong.");
  }

  async function download() {
    setBusy("download");
    setErr(null);
    setMsg(null);
    try {
      // Server route checks authorization and redirects to a signed URL.
      window.location.href = `/api/download/${productId}`;
      setMsg("Preparing your download...");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function wishlist() {
    setBusy("wishlist");
    setErr(null);
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/sign-in";
        return;
      }
      const { error } = await supabase
        .from("wishlists")
        .upsert({ user_id: auth.user.id, product_id: productId });
      if (error) throw error;
      setMsg("Added to your wishlist.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function follow() {
    setBusy("follow");
    setErr(null);
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/sign-in";
        return;
      }
      const { error } = await supabase
        .from("developer_follows")
        .upsert({ user_id: auth.user.id, developer_id: developerId });
      if (error) throw error;
      setMsg("Following this developer.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: productName, url });
      } else {
        await navigator.clipboard.writeText(url);
        setMsg("Link copied.");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  }

  async function report() {
    const reason = window.prompt(
      "Report this product. Reason (inappropriate / copyright / malicious_file / spam / other):"
    );
    if (!reason) return;
    const details = window.prompt("Add details (optional):") ?? "";
    setBusy("report");
    setErr(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/sign-in";
        return;
      }
      const allowed = ["inappropriate", "copyright", "malicious_file", "spam", "other"];
      const { error } = await supabase.from("reports").insert({
        reporter_id: auth.user.id,
        product_id: productId,
        reason: allowed.includes(reason) ? reason : "other",
        details
      });
      if (error) throw error;
      setMsg("Report sent. Our moderation team will review it.");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {hasFile && (
          <button className="btn btn-gold" onClick={download} disabled={busy !== null}>
            {priceCents === 0 ? "Download" : "Buy & download"}
          </button>
        )}
        <button className="btn btn-ghost" onClick={wishlist} disabled={busy !== null}>
          Wishlist
        </button>
        <button className="btn btn-ghost" onClick={share}>Share</button>
        <button className="btn btn-ghost" onClick={follow} disabled={busy !== null}>
          Follow developer
        </button>
        <button className="btn btn-ghost" onClick={report} disabled={busy !== null}
          style={{ color: "var(--danger)" }}>
          Report
        </button>
      </div>
      {msg && <p role="status" style={{ color: "var(--ok)", fontSize: "0.88rem", marginTop: 10 }}>{msg}</p>}
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem", marginTop: 10 }}>{err}</p>}
    </div>
  );
}
