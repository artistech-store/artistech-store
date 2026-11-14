"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function FollowButton({ developerId }: { developerId: string }) {
  const [state, setState] = useState<"idle" | "following" | "error">("idle");
  const [busy, setBusy] = useState(false);

  async function follow() {
    setBusy(true);
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
      setState("following");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-gold" onClick={follow} disabled={busy || state === "following"}>
      {state === "following" ? "Following \u2713" : busy ? "Working..." : state === "error" ? "Try again" : "Follow developer"}
    </button>
  );
}
