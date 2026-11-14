import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { HeaderAuth } from "./header-auth";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand" aria-label="ArtisTech.Store home">
          <span className="brand-logo">
            {/* Official ArtisTech logo - used exactly as supplied */}
            <img src="/brand/logo.png" alt="ArtisTech logo" width={36} height={36} />
          </span>
          ArtisTech <span className="brand-stores">Stores</span>
        </Link>

        <nav className="main-nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/developers">Developers</Link>
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <HeaderAuth />
          <Link className="btn btn-gold" href="/publish">
            Publish
          </Link>
        </div>
      </div>
    </header>
  );
}
