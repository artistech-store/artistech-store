import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Records a genuine ad impression or click. Fire-and-forget from the
 * client; the database function validates that the ad is actually live
 * before counting, so junk calls change nothing.
 */
export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: { adId?: string; event?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.adId || (body.event !== "impression" && body.event !== "click")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createClient(url, anonKey);
  const fn = body.event === "impression" ? "record_ad_impression" : "record_ad_click";
  await supabase.rpc(fn, { ad_id: body.adId });
  return NextResponse.json({ ok: true });
}
