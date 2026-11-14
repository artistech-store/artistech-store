"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  tagline: string | null;
  description: string;
  status: string;
  current_version: string | null;
}
interface Version {
  id: string;
  version: string;
  changelog: string;
  file_size: number | null;
  is_current: boolean;
  created_at: string;
}

const MAX_FILE = 512 * 1024 * 1024;

export function ManageProduct({ product, versions }: { product: Product; versions: Version[] }) {
  const router = useRouter();
  const [name, setName] = useState(product.name);
  const [tagline, setTagline] = useState(product.tagline ?? "");
  const [description, setDescription] = useState(product.description);
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const input: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 11,
    color: "var(--text)", padding: "12px 13px", fontSize: "0.95rem", fontFamily: "inherit", width: "100%"
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6
  };

  async function saveDetails() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ name: name.trim(), tagline: tagline.trim() || null, description: description.trim() })
        .eq("id", product.id);
      if (error) throw error;
      setMsg("Details saved.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function addVersion() {
    if (!version.trim()) {
      setErr("Enter a version number.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const supabase = createClient();
      let filePath: string | null = null;
      let fileSize: number | null = null;
      if (file) {
        if (file.size > MAX_FILE) throw new Error("File is over 512 MB.");
        setMsg(`Uploading ${file.name}...`);
        filePath = `${product.id}/${version.trim()}-${file.name}`;
        fileSize = file.size;
        const { error } = await supabase.storage.from("product-files").upload(filePath, file);
        if (error) throw new Error("File upload: " + error.message);
      }
      await supabase.from("product_versions").update({ is_current: false }).eq("product_id", product.id);
      const { error } = await supabase.from("product_versions").insert({
        product_id: product.id,
        version: version.trim(),
        changelog: changelog.trim(),
        file_path: filePath,
        file_size: fileSize,
        is_current: true
      });
      if (error) throw error;
      await supabase.from("products").update({ current_version: version.trim() }).eq("id", product.id);
      setMsg("Version " + version.trim() + " published to your product.");
      setVersion("");
      setChangelog("");
      setFile(null);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add the version.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForReview() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .update({ status: "pending_review" })
        .eq("id", product.id);
      if (error) throw error;
      setMsg("Submitted for moderation.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 640, gap: 26 }}>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
        Status: <strong style={{ textTransform: "capitalize" }}>{product.status.replace(/_/g, " ")}</strong>
      </p>

      <section aria-label="Edit details">
        <h2 className="section-title" style={{ marginBottom: 10 }}>Details</h2>
        <div style={{ marginBottom: 14 }}><label style={label} htmlFor="m-name">Name</label>
          <input id="m-name" style={input} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label style={label} htmlFor="m-tag">Tagline</label>
          <input id="m-tag" style={input} value={tagline} maxLength={140} onChange={(e) => setTagline(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label style={label} htmlFor="m-desc">Description</label>
          <textarea id="m-desc" style={{ ...input, minHeight: 110 }} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <button className="btn btn-ghost" onClick={saveDetails} disabled={busy}>Save details</button>
      </section>

      <section aria-label="Versions">
        <h2 className="section-title" style={{ marginBottom: 10 }}>Versions</h2>
        {versions.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: "0.88rem" }}>No versions yet.</p>
        ) : (
          <div className="stack" style={{ gap: 6, marginBottom: 16 }}>
            {versions.map((v) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <span>
                  <strong>{v.version}</strong>
                  {v.is_current && <span style={{ color: "var(--accent)" }}> (current)</span>}
                </span>
                <span style={{ color: "var(--text-faint)" }}>
                  {v.file_size != null ? `${Math.round(v.file_size / 1024 / 1024)} MB \u00b7 ` : ""}
                  {new Date(v.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginBottom: 14 }}><label style={label} htmlFor="m-ver">New version</label>
          <input id="m-ver" style={input} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.1.0" /></div>
        <div style={{ marginBottom: 14 }}><label style={label} htmlFor="m-log">Changelog</label>
          <textarea id="m-log" style={{ ...input, minHeight: 70 }} value={changelog} onChange={(e) => setChangelog(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><label style={label} htmlFor="m-file">Replacement file (optional)</label>
          <input id="m-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <button className="btn btn-ghost" onClick={addVersion} disabled={busy}>Add version</button>
      </section>

      {(product.status === "draft" || product.status === "changes_requested" || product.status === "rejected") && (
        <section aria-label="Submit">
          <button className="btn btn-gold" onClick={submitForReview} disabled={busy}>Submit for review</button>
        </section>
      )}

      {msg && <p role="status" style={{ color: "var(--ok)", fontSize: "0.88rem" }}>{msg}</p>}
      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem" }}>{err}</p>}
    </div>
  );
}
