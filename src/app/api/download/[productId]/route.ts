import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Authorized download endpoint.
 *
 * Flow: authenticate -> load product (must be published) -> for free
 * products, record the download (trigger updates counters + analytics),
 * then issue a short-lived signed URL for the private product-files bucket
 * and redirect. Paid products require payment verification before this route
 * ever signs a URL (payments land in a later phase; paid downloads return
 * 402 until then - never a fake download).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Store backend not configured." }, { status: 503 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {}
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Product lookup as the calling user: RLS guarantees only published
  // products (or own/admin) are visible.
  const { data: product } = await supabase
    .from("products")
    .select("id, status, price_cents, name")
    .eq("id", params.productId)
    .maybeSingle();

  if (!product || product.status !== "published") {
    return NextResponse.json({ error: "Product not available." }, { status: 404 });
  }

  if (product.price_cents > 0) {
    // Payment verification arrives with the payments phase. Never sign a URL
    // for an unpaid paid product.
    return NextResponse.json(
      { error: "Paid downloads require verified payment; payments are not enabled yet." },
      { status: 402 }
    );
  }

  // Current version with an actual file
  const { data: version } = await supabase
    .from("product_versions")
    .select("id, file_path")
    .eq("product_id", product.id)
    .eq("is_current", true)
    .not("file_path", "is", null)
    .maybeSingle();

  if (!version?.file_path) {
    return NextResponse.json(
      { error: "No downloadable file is attached to this product yet." },
      { status: 404 }
    );
  }

  // Record the download (RLS: user inserts their own row). The trigger
  // updates products.download_count and appends to download_events.
  const { error: dlError } = await supabase.from("product_downloads").insert({
    product_id: product.id,
    version_id: version.id,
    user_id: user.id
  });
  if (dlError) {
    return NextResponse.json({ error: "Could not record the download." }, { status: 500 });
  }

  // Service role issues the signed URL for the private bucket.
  const admin = createServerClient(url, serviceKey, {
    cookies: { get: () => undefined, set() {}, remove() {} }
  });
  const { data: signed, error: signError } = await admin.storage
    .from("product-files")
    .createSignedUrl(version.file_path, 120); // 2-minute expiry

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not authorize the file." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
