"use client";

import { useEffect, useRef } from "react";
import type { SponsoredItem } from "@/lib/data";

/**
 * Sponsored placement. Clearly labeled, visually separated from organic
 * rankings; fires genuine impression (on view) and click events.
 */
export function SponsoredCard({ item }: { item: SponsoredItem }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fired.current) {
          fired.current = true;
          fetch("/api/ad-event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ adId: item.adId, event: "impression" })
          }).catch(() => {});
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [item.adId]);

  return (
    <a
      ref={ref}
      href={`/products/${item.slug}`}
      onClick={() => {
        fetch("/api/ad-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adId: item.adId, event: "click" })
        }).catch(() => {});
      }}
      className="product-card"
      style={{ borderStyle: "dashed", borderColor: "var(--line-strong)" }}
    >
      <div className="product-card-head">
        {item.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.iconUrl} alt="" width={48} height={48} className="product-icon" loading="lazy" />
        ) : (
          <span className="product-icon" aria-hidden="true" />
        )}
        <div>
          <div className="product-name">{item.name}</div>
          <div className="product-dev">{item.developerName}</div>
        </div>
      </div>
      {item.tagline && <p className="product-tagline">{item.tagline}</p>}
      <div className="product-meta">
        <span style={{ color: "var(--accent)" }}>Sponsored</span>
      </div>
    </a>
  );
}
