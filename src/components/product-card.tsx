import Link from "next/link";
import type { ProductSummary } from "@/lib/types";

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/products/${product.slug}`} className="product-card">
      <div className="product-card-head">
        {product.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.icon_url}
            alt=""
            width={48}
            height={48}
            className="product-icon"
            loading="lazy"
          />
        ) : (
          <span className="product-icon" aria-hidden="true" />
        )}
        <div>
          <div className="product-name">{product.name}</div>
          <div className="product-dev">{product.developer_name}</div>
        </div>
      </div>
      {product.tagline && <p className="product-tagline">{product.tagline}</p>}
      <div className="product-meta">
        <span>{product.category_name}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{product.price_cents === 0 ? "Free" : "Paid"}</span>
      </div>
    </Link>
  );
}
