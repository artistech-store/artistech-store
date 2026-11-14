"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface PendingProduct {
  id: string; name: string; kind: string; status: string;
  created_at: string; developer: string;
}
interface Report {
  id: string; reason: string; details: string; created_at: string; product: string;
}
interface UserRow {
  id: string; username: string; display_name: string | null;
  role: string; is_suspended: boolean; created_at: string;
}
interface CategoryRow {
  id: string; slug: string; name: string; position: number;
}
interface AuditRow {
  id: number; action: string; entity_type: string; entity_id: string | null; created_at: string;
}
interface AdRow {
  id: string; placement: string; status: string; impressions: number; clicks: number;
  product: string; campaign: string; budget: number; starts_at: string; ends_at: string;
}

const TABS = ["Moderation", "Reports", "Users", "Ads", "Categories", "Audit log"];

export function AdminPanel({
  pending, reports, users, categories, audit, ads
}: {
  pending: PendingProduct[];
  reports: Report[];
  users: UserRow[];
  categories: CategoryRow[];
  audit: AuditRow[];
  ads: AdRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [newCat, setNewCat] = useState("");

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function moderate(p: PendingProduct, decision: "published" | "rejected" | "changes_requested") {
    await act(p.id + decision, async () => {
      const supabase = createClient();
      const update: Record<string, unknown> = { status: decision };
      if (decision === "published") update.published_at = new Date().toISOString();
      const { error } = await supabase.from("products").update(update).eq("id", p.id);
      if (error) throw error;
      await supabase.rpc("write_audit", {
        action: "product." + decision,
        entity_type: "product",
        entity_id: p.id,
        metadata: { name: p.name }
      });
      // The developer is notified by the products_notify_status database trigger.
    });
  }

  async function resolveReport(r: Report) {
    await act(r.id, async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("reports")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", r.id);
      if (error) throw error;
      await supabase.rpc("write_audit", {
        action: "report.resolve", entity_type: "report", entity_id: r.id, metadata: {}
      });
    });
  }

  async function setSuspended(u: UserRow, suspend: boolean) {
    await act(u.id, async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: suspend })
        .eq("id", u.id);
      if (error) throw error;
      await supabase.rpc("write_audit", {
        action: suspend ? "user.suspend" : "user.restore",
        entity_type: "profile", entity_id: u.id, metadata: { username: u.username }
      });
    });
  }

  async function setRole(u: UserRow, role: "user" | "developer" | "admin") {
    await act(u.id + role, async () => {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ role }).eq("id", u.id);
      if (error) throw error;
      await supabase.rpc("write_audit", {
        action: "user.role." + role, entity_type: "profile", entity_id: u.id,
        metadata: { username: u.username }
      });
    });
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    await act("newcat", async () => {
      const supabase = createClient();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const { error } = await supabase
        .from("product_categories")
        .insert({ name, slug, position: (categories[categories.length - 1]?.position ?? 0) + 10 });
      if (error) throw error;
      setNewCat("");
      await supabase.rpc("write_audit", {
        action: "category.create", entity_type: "category", entity_id: slug, metadata: { name }
      });
    });
  }

  async function setAdStatus(a: AdRow, status: "active" | "rejected" | "paused") {
    await act(a.id + status, async () => {
      const supabase = createClient();
      const { error } = await supabase.from("advertisements").update({ status }).eq("id", a.id);
      if (error) throw error;
      await supabase.rpc("write_audit", {
        action: "ad." + status, entity_type: "advertisement", entity_id: a.id,
        metadata: { product: a.product, campaign: a.campaign }
      });
    });
  }

  const card: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--line)",
    borderRadius: 12, padding: "12px 14px"
  };

  return (
    <div>
      <nav aria-label="Admin sections" style={{ display: "flex", gap: 6, margin: "12px 0 18px", flexWrap: "wrap" }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            fontSize: "0.8rem", fontWeight: 700, padding: "7px 14px", borderRadius: 999,
            border: "1px solid var(--line)", cursor: "pointer",
            background: i === tab ? "var(--grad-gold)" : "var(--card)",
            color: i === tab ? "#1a1305" : "var(--text-muted)", fontFamily: "inherit"
          }}>
            {t}{i === 0 && pending.length > 0 ? ` (${pending.length})` : ""}{i === 1 && reports.length > 0 ? ` (${reports.length})` : ""}
          </button>
        ))}
      </nav>

      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem", marginBottom: 10 }}>{err}</p>}

      {tab === 0 && (
        <div className="stack" style={{ gap: 10 }}>
          {pending.length === 0 ? (
            <div className="empty-state"><strong>Queue is clear</strong><p>Submitted products waiting for review appear here.</p></div>
          ) : pending.map((p) => (
            <div key={p.id} style={card}>
              <strong>{p.name}</strong>
              <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>
                {" \u00b7 "}{p.kind.replace(/_/g, " ")}{" \u00b7 "}by {p.developer}{" \u00b7 "}
                {new Date(p.created_at).toLocaleDateString()}
              </span>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn btn-gold" disabled={busy !== null} onClick={() => moderate(p, "published")}>Approve &amp; publish</button>
                <button className="btn btn-ghost" disabled={busy !== null} onClick={() => moderate(p, "changes_requested")}>Request changes</button>
                <button className="btn btn-ghost" style={{ color: "var(--danger)" }} disabled={busy !== null} onClick={() => moderate(p, "rejected")}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 1 && (
        <div className="stack" style={{ gap: 10 }}>
          {reports.length === 0 ? (
            <div className="empty-state"><strong>No open reports</strong><p>User reports about products and reviews appear here.</p></div>
          ) : reports.map((r) => (
            <div key={r.id} style={card}>
              <strong>{r.reason.replace(/_/g, " ")}</strong>
              <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>
                {" \u00b7 "}{r.product}{" \u00b7 "}{new Date(r.created_at).toLocaleDateString()}
              </span>
              {r.details && <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: 6 }}>{r.details}</p>}
              <div style={{ marginTop: 10 }}>
                <button className="btn btn-ghost" disabled={busy !== null} onClick={() => resolveReport(r)}>Mark resolved</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 2 && (
        <div className="stack" style={{ gap: 8 }}>
          {users.map((u) => (
            <div key={u.id} style={{ ...card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <strong>{u.display_name || u.username}</strong>
                <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>
                  {" "}@{u.username} \u00b7 {u.role}{u.is_suspended ? " \u00b7 SUSPENDED" : ""}
                </span>
              </div>
              <select
                aria-label={`Role for ${u.username}`}
                defaultValue={u.role}
                disabled={busy !== null}
                onChange={(e) => setRole(u, e.target.value as "user" | "developer" | "admin")}
                style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 9, color: "var(--text)", padding: "7px 10px", fontFamily: "inherit" }}>
                <option value="user">user</option>
                <option value="developer">developer</option>
                <option value="admin">admin</option>
              </select>
              <button className="btn btn-ghost" disabled={busy !== null}
                style={u.is_suspended ? {} : { color: "var(--danger)" }}
                onClick={() => setSuspended(u, !u.is_suspended)}>
                {u.is_suspended ? "Restore" : "Suspend"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 3 && (
        <div className="stack" style={{ gap: 10 }}>
          {ads.length === 0 ? (
            <div className="empty-state"><strong>No sponsorships yet</strong><p>Developer sponsorship requests appear here for review.</p></div>
          ) : ads.map((a) => (
            <div key={a.id} style={{ ...card, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong>{a.product}</strong>
                <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>
                  {" \u00b7 "}{a.campaign}{" \u00b7 "}{a.placement} placement{" \u00b7 "}{a.status}{" \u00b7 "}Rs {a.budget}{" \u00b7 "}
                  {a.impressions} views / {a.clicks} clicks
                </span>
              </div>
              {a.status === "pending_approval" && (
                <span style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-gold" disabled={busy !== null} onClick={() => setAdStatus(a, "active")}>Approve</button>
                  <button className="btn btn-ghost" style={{ color: "var(--danger)" }} disabled={busy !== null} onClick={() => setAdStatus(a, "rejected")}>Reject</button>
                </span>
              )}
              {a.status === "active" && (
                <button className="btn btn-ghost" disabled={busy !== null} onClick={() => setAdStatus(a, "paused")}>Pause</button>
              )}
              {a.status === "paused" && (
                <button className="btn btn-gold" disabled={busy !== null} onClick={() => setAdStatus(a, "active")}>Resume</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 4 && (
        <div className="stack" style={{ gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name"
              aria-label="New category name"
              style={{ flex: 1, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 11, color: "var(--text)", padding: "11px 13px", fontFamily: "inherit" }} />
            <button className="btn btn-gold" onClick={addCategory} disabled={busy !== null}>Add</button>
          </div>
          {categories.map((c) => (
            <div key={c.id} style={{ ...card, display: "flex", justifyContent: "space-between" }}>
              <span>{c.name}</span>
              <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>/{c.slug}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 5 && (
        <div className="stack" style={{ gap: 6 }}>
          {audit.length === 0 ? (
            <div className="empty-state"><strong>No admin actions yet</strong><p>Every sensitive administrative action is recorded here.</p></div>
          ) : audit.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: "0.85rem", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <span><strong>{a.action}</strong> <span style={{ color: "var(--text-faint)" }}>{a.entity_type}</span></span>
              <time style={{ color: "var(--text-faint)" }}>{new Date(a.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
