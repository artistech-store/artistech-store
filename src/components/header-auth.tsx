"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function HeaderAuth() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (signedIn) {
    return (
      <Link className="btn btn-ghost" href="/dashboard">
        Account
      </Link>
    );
  }
  return (
    <Link className="btn btn-ghost" href="/sign-in">
      Sign In
    </Link>
  );
}
