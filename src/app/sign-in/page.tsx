"use client";

import { useState } from "react";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else if (mode === "signup") setMessage("Check your email to verify your account, then sign in.");
      else window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ marginTop: 32, maxWidth: 420, marginInline: "auto" }}>
      <h1 className="section-title">{mode === "signin" ? "Sign in" : "Create your account"}</h1>

      {!isSupabaseConfigured() && (
        <div className="empty-state">
          <strong>Authentication not connected yet</strong>
          <p>This deployment is waiting on its Supabase credentials (see .env.example). Sign-in activates the moment they are set.</p>
        </div>
      )}

      <form onSubmit={submit} className="stack" aria-label={mode === "signin" ? "Sign in" : "Sign up"}>
        <label className="stack" style={{ gap: 6 }}>
          <span style={labelStyle}>Email</span>
          <input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </label>
        <label className="stack" style={{ gap: 6 }}>
          <span style={labelStyle}>Password</span>
          <input type="password" required minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </label>
        {error && <p role="alert" style={{ color: "var(--danger)", fontSize: "0.88rem" }}>{error}</p>}
        {message && <p role="status" style={{ color: "var(--ok)", fontSize: "0.88rem" }}>{message}</p>}
        <button className="btn btn-gold" type="submit" disabled={busy || !isSupabaseConfigured()}>
          {busy ? "Working..." : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", textAlign: "center" }}>
        {mode === "signin" ? "New to ArtisTech? " : "Already have an account? "}
        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setMessage(null); }}
          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", font: "inherit", fontWeight: 700 }}>
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 11,
  color: "var(--text)",
  padding: "12px 13px",
  fontSize: "0.95rem",
  fontFamily: "inherit",
  width: "100%"
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "var(--text-muted)",
  letterSpacing: 0.8,
  textTransform: "uppercase"
};
