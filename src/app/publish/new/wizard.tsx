"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Category {
  id: string;
  slug: string;
  name: string;
  kind: string | null;
}

const KINDS: [string, string][] = [
  ["android_app", "Android application"],
  ["windows_software", "Windows software"],
  ["macos_app", "macOS application"],
  ["linux_app", "Linux application"],
  ["web_app", "Web application"],
  ["mobile_game", "Mobile game"],
  ["pc_game", "PC game"],
  ["browser_game", "Browser game"],
  ["ai_tool", "AI tool"],
  ["developer_tool", "Developer tool"],
  ["open_source", "Open-source project"],
  ["ui_kit", "UI kit / template"],
  ["design_resource", "Graphic design resource"],
  ["creative_project", "Creative project"],
  ["educational", "Educational software"],
  ["productivity", "Productivity tool"],
  ["other", "Other"]
];

const STEPS = ["Developer profile", "Product", "Media", "File & version", "Review & submit"];

const MAX_ICON = 2 * 1024 * 1024;        // 2 MB
const MAX_SHOT = 5 * 1024 * 1024;        // 5 MB
const MAX_FILE = 512 * 1024 * 1024;      // 512 MB

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
}

export function PublishWizard({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // step 0
  const [devName, setDevName] = useState("");
  const [devSlug, setDevSlug] = useState("");
  const [devBio, setDevBio] = useState("");
  const [devWebsite, setDevWebsite] = useState("");
  // step 1
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [kind, setKind] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [platforms, setPlatforms] = useState("");
  const [license, setLicense] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  // step 2
  const [icon, setIcon] = useState<File | null>(null);
  const [shots, setShots] = useState<File[]>([]);
  // step 3
  const [version, setVersion] = useState("1.0.0");
  const [changelog, setChangelog] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function fail(msg: string) {
    setErr(msg);
    setBusy(false);
    setProgress(null);
  }

  async function submit(forModeration: boolean) {
    setErr(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = "/sign-in";
        return;
      }
      const uid = auth.user.id;

      // --- developer profile (create once) ---
      setProgress("Checking developer profile...");
      let { data: dev } = await supabase
        .from("developer_profiles")
        .select("id")
        .eq("id", uid)
        .maybeSingle();

      if (!dev) {
        if (!devName.trim() || !slugify(devSlug || devName)) {
          fail("Step 1: developer name and a valid URL slug are required.");
          return;
        }
        const { data: created, error } = await supabase
          .from("developer_profiles")
          .insert({
            id: uid,
            slug: slugify(devSlug || devName),
            display_name: devName.trim(),
            bio: devBio.trim() || null,
            website: devWebsite.trim() || null
          })
          .select("id")
          .single();
        if (error) throw new Error("Developer profile: " + error.message);
        dev = created;
      }

      // --- product ---
      if (!name.trim() || !kind || !categoryId) {
        fail("Step 2: product name, type and category are required.");
        return;
      }
      const slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 7);
      setProgress("Creating product draft...");
      const { data: product, error: pErr } = await supabase
        .from("products")
        .insert({
          developer_id: uid,
          category_id: categoryId,
          kind,
          slug,
          name: name.trim(),
          tagline: tagline.trim() || null,
          description: description.trim(),
          platforms: platforms.split(",").map((s) => s.trim()).filter(Boolean),
          license: license.trim() || null,
          privacy_policy_url: privacyUrl.trim() || null,
          external_url: externalUrl.trim() || null,
          status: "draft"
        })
        .select("id")
        .single();
      if (pErr) throw new Error("Product: " + pErr.message);
      const pid = product.id as string;

      // --- media ---
      if (icon) {
        if (icon.size > MAX_ICON) throw new Error("Icon is over 2 MB.");
        setProgress("Uploading icon...");
        const path = `${pid}/icon-${Date.now()}`;
        const { error } = await supabase.storage.from("product-icons").upload(path, icon);
        if (error) throw new Error("Icon upload: " + error.message);
        const { data: pub } = supabase.storage.from("product-icons").getPublicUrl(path);
        await supabase.from("products").update({ icon_url: pub.publicUrl }).eq("id", pid);
        await supabase.from("product_media").insert({ product_id: pid, kind: "icon", url: pub.publicUrl, position: 0 });
      }
      for (let i = 0; i < shots.length; i++) {
        if (shots[i].size > MAX_SHOT) throw new Error(`Screenshot ${i + 1} is over 5 MB.`);
        setProgress(`Uploading screenshot ${i + 1} of ${shots.length}...`);
        const path = `${pid}/shot-${Date.now()}-${i}`;
        const { error } = await supabase.storage.from("product-media").upload(path, shots[i]);
        if (error) throw new Error("Screenshot upload: " + error.message);
        const { data: pub } = supabase.storage.from("product-media").getPublicUrl(path);
        await supabase.from("product_media").insert({ product_id: pid, kind: "screenshot", url: pub.publicUrl, position: i + 1 });
      }

      // --- version + file ---
      setProgress("Saving version...");
      let filePath: string | null = null;
      let fileSize: number | null = null;
      if (file) {
        if (file.size > MAX_FILE) throw new Error("Product file is over 512 MB.");
        setProgress(`Uploading ${file.name} (${Math.round(file.size / 1024 / 1024)} MB)... this can take a while`);
        filePath = `${pid}/${slugify(version)}-${file.name}`;
        fileSize = file.size;
        const { error } = await supabase.storage.from("product-files").upload(filePath, file);
        if (error) throw new Error("File upload: " + error.message);
      }
      const { error: vErr } = await supabase.from("product_versions").insert({
        product_id: pid,
        version: version.trim() || "1.0.0",
        changelog: changelog.trim(),
        file_path: filePath,
        file_size: fileSize,
        is_current: true
      });
      if (vErr) throw new Error("Version: " + vErr.message);
      await supabase.from("products").update({ current_version: version.trim() || "1.0.0" }).eq("id", pid);

      // --- submit ---
      if (forModeration) {
        if (!file && !externalUrl.trim()) {
          fail("Add a product file or a verified external URL before submitting for review.");
          return;
        }
        setProgress("Submitting for moderation...");
        const { error } = await supabase
          .from("products")
          .update({ status: "pending_review" })
          .eq("id", pid);
        if (error) throw new Error("Submission: " + error.message);
      }

      router.push("/dashboard/developer");
      router.refresh();
    } catch (e) {
      fail(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const input: React.CSSProperties = {
    background: "var(--card)", border: "1px solid var(--line)", borderRadius: 11,
    color: "var(--text)", padding: "12px 13px", fontSize: "0.95rem", fontFamily: "inherit", width: "100%"
  };
  const label: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)",
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6
  };
  const fld: React.CSSProperties = { marginBottom: 16 };

  return (
    <div style={{ maxWidth: 640 }}>
      <nav aria-label="Publishing steps" style={{ display: "flex", gap: 6, margin: "10px 0 22px", flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <span key={s} style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "5px 11px", borderRadius: 999,
            border: "1px solid var(--line)",
            background: i === step ? "var(--grad-gold)" : "var(--card)",
            color: i === step ? "#1a1305" : "var(--text-faint)"
          }}>
            {i + 1}. {s}
          </span>
        ))}
      </nav>

      {step === 0 && (
        <section aria-label="Developer profile">
          <div style={fld}><label style={label} htmlFor="dev-name">Developer / publisher name *</label>
            <input id="dev-name" style={input} value={devName} maxLength={80}
              onChange={(e) => setDevName(e.target.value)} placeholder="e.g. Sahil Katwale" /></div>
          <div style={fld}><label style={label} htmlFor="dev-slug">Profile URL slug</label>
            <input id="dev-slug" style={input} value={devSlug} maxLength={60}
              onChange={(e) => setDevSlug(e.target.value)} placeholder={slugify(devName) || "your-name"} /></div>
          <div style={fld}><label style={label} htmlFor="dev-bio">Bio</label>
            <textarea id="dev-bio" style={{ ...input, minHeight: 80 }} value={devBio} maxLength={2000}
              onChange={(e) => setDevBio(e.target.value)} /></div>
          <div style={fld}><label style={label} htmlFor="dev-site">Website</label>
            <input id="dev-site" style={input} type="url" value={devWebsite}
              onChange={(e) => setDevWebsite(e.target.value)} placeholder="https://" /></div>
          <p style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>
            Already have a developer profile? It will be reused - these fields only apply on first publish.
          </p>
        </section>
      )}

      {step === 1 && (
        <section aria-label="Product details">
          <div style={fld}><label style={label} htmlFor="p-name">Product name *</label>
            <input id="p-name" style={input} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /></div>
          <div style={fld}><label style={label} htmlFor="p-tag">Tagline</label>
            <input id="p-tag" style={input} value={tagline} maxLength={140} onChange={(e) => setTagline(e.target.value)} /></div>
          <div style={fld}><label style={label} htmlFor="p-kind">Product type *</label>
            <select id="p-kind" style={input} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Choose a type</option>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div style={fld}><label style={label} htmlFor="p-cat">Category *</label>
            <select id="p-cat" style={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Choose a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div style={fld}><label style={label} htmlFor="p-desc">Full description</label>
            <textarea id="p-desc" style={{ ...input, minHeight: 120 }} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div style={fld}><label style={label} htmlFor="p-plat">Platforms (comma separated)</label>
            <input id="p-plat" style={input} value={platforms} onChange={(e) => setPlatforms(e.target.value)} placeholder="Android, Windows, Web" /></div>
          <div style={fld}><label style={label} htmlFor="p-lic">License</label>
            <input id="p-lic" style={input} value={license} onChange={(e) => setLicense(e.target.value)} placeholder="MIT, Proprietary, ..." /></div>
          <div style={fld}><label style={label} htmlFor="p-priv">Privacy policy URL</label>
            <input id="p-priv" style={input} type="url" value={privacyUrl} onChange={(e) => setPrivacyUrl(e.target.value)} /></div>
        </section>
      )}

      {step === 2 && (
        <section aria-label="Media">
          <div style={fld}><label style={label} htmlFor="p-icon">Product icon (max 2 MB)</label>
            <input id="p-icon" type="file" accept="image/*" onChange={(e) => setIcon(e.target.files?.[0] ?? null)} /></div>
          <div style={fld}><label style={label} htmlFor="p-shots">Screenshots (up to 8, max 5 MB each)</label>
            <input id="p-shots" type="file" accept="image/*" multiple
              onChange={(e) => setShots(Array.from(e.target.files ?? []).slice(0, 8))} /></div>
        </section>
      )}

      {step === 3 && (
        <section aria-label="File and version">
          <div style={fld}><label style={label} htmlFor="p-ver">Version *</label>
            <input id="p-ver" style={input} value={version} onChange={(e) => setVersion(e.target.value)} /></div>
          <div style={fld}><label style={label} htmlFor="p-log">Changelog</label>
            <textarea id="p-log" style={{ ...input, minHeight: 80 }} value={changelog} onChange={(e) => setChangelog(e.target.value)} /></div>
          <div style={fld}><label style={label} htmlFor="p-file">Product file (max 512 MB)</label>
            <input id="p-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p style={{ color: "var(--text-faint)", fontSize: "0.78rem", marginTop: 6 }}>
              Files stay in private storage and are scanned before release. Or provide an external URL below.
            </p></div>
          <div style={fld}><label style={label} htmlFor="p-ext">External product URL</label>
            <input id="p-ext" style={input} type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" /></div>
        </section>
      )}

      {step === 4 && (
        <section aria-label="Review and submit">
          <dl style={{ fontSize: "0.92rem", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "6px 16px" }}>
            {[
              ["Product", name || "-"],
              ["Type", KINDS.find(([v]) => v === kind)?.[1] ?? "-"],
              ["Category", categories.find((c) => c.id === categoryId)?.name ?? "-"],
              ["Version", version],
              ["Icon", icon ? icon.name : "none"],
              ["Screenshots", String(shots.length)],
              ["File", file ? `${file.name} (${Math.round(file.size / 1024 / 1024)} MB)` : "none"],
              ["External URL", externalUrl || "none"]
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <dt style={{ color: "var(--text-faint)" }}>{k}</dt><dd style={{ fontWeight: 600, textAlign: "right" }}>{v}</dd>
              </div>
            ))}
          </dl>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 12 }}>
            Submitting sends the product to an administrator for review. You can
            also save it as a draft and finish later.
          </p>
        </section>
      )}

      {err && <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem", margin: "10px 0" }}>{err}</p>}
      {progress && <p role="status" style={{ color: "var(--accent)", fontSize: "0.88rem", margin: "10px 0" }}>{progress}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        {step > 0 && <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>Back</button>}
        {step < STEPS.length - 1 && (
          <button className="btn btn-gold" onClick={() => setStep(step + 1)} disabled={busy}>Next</button>
        )}
        {step === STEPS.length - 1 && (
          <>
            <button className="btn btn-ghost" onClick={() => submit(false)} disabled={busy}>Save draft</button>
            <button className="btn btn-gold" onClick={() => submit(true)} disabled={busy}>Submit for review</button>
          </>
        )}
      </div>
    </div>
  );
}
