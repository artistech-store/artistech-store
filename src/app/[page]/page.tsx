import { notFound } from "next/navigation";
import type { Metadata } from "next";

/**
 * Static content pages (real content, no placeholders):
 * /about /help /privacy /terms /guidelines
 */

const PAGES: Record<string, { title: string; body: string[] }> = {
  about: {
    title: "About ArtisTech",
    body: [
      "ArtisTech.Store is a modern digital ecosystem for discovering and distributing software, applications, games, development tools, and creative digital projects.",
      "Creators and developers can publish their digital products for free. Visitors can discover and access those products in one place.",
      "Build. Collaborate. Publish."
    ]
  },
  help: {
    title: "Help Center",
    body: [
      "Browsing: guests can explore the marketplace, search products, view product pages and developer profiles, and read public reviews.",
      "Accounts: sign up to download products, keep a wishlist, write reviews, follow developers and receive notifications.",
      "Publishing: create a developer profile, submit your product with its files and media, and track it through moderation - publishing ordinary eligible products is free.",
      "Something wrong with a listing? Use the Report action on its page and the moderation team will review it."
    ]
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      "ArtisTech.Store collects only the data needed to run the marketplace: your account details, your activity (downloads, reviews, wishlists, follows), and content you publish.",
      "Authentication and data storage are provided by Supabase with row-level security: private records are readable only by their owner and authorized administrators.",
      "We never sell personal data. Download and rating statistics are shown in aggregate.",
      "You can request deletion of your account and associated personal data at any time."
    ]
  },
  terms: {
    title: "Terms & Conditions",
    body: [
      "You must own, or have the rights to distribute, anything you publish on ArtisTech.Store.",
      "Prohibited content includes malware, pirated software, deceptive listings, and unlawful material. Violations lead to removal and possible account suspension.",
      "Products are moderated before publication; approval is not an endorsement of a product's quality or safety.",
      "Basic publishing is free. Optional promotional features are clearly labeled as sponsored."
    ]
  },
  guidelines: {
    title: "Community Guidelines",
    body: [
      "Be honest: accurate descriptions, real screenshots, no fake reviews or manipulated ratings.",
      "Be respectful: no harassment, hate, or spam in reviews, replies, or product content.",
      "Be safe: no malicious files, no hidden data collection, no exploits. Executable products are reviewed before they become downloadable.",
      "Repeated violations result in suspension. Decisions can be appealed through the Help Center."
    ]
  }
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export function generateMetadata({ params }: { params: { page: string } }): Metadata {
  const p = PAGES[params.page];
  return p ? { title: p.title } : {};
}

export default function InfoPage({ params }: { params: { page: string } }) {
  const page = PAGES[params.page];
  if (!page) notFound();
  return (
    <article className="stack" style={{ marginTop: 32, maxWidth: 720 }}>
      <h1 className="section-title">{page.title}</h1>
      {page.body.map((para, i) => (
        <p key={i} style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{para}</p>
      ))}
    </article>
  );
}
