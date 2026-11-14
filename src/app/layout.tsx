import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://artistech.store";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ArtisTech.Store - Build. Collaborate. Publish.",
    template: "%s | ArtisTech.Store"
  },
  description:
    "ArtisTech.Store is a modern digital marketplace for applications, games, tools and creative projects. Discover something new or publish your own work with ArtisTech.",
  icons: { icon: "/brand/logo.png", apple: "/brand/logo.png" },
  openGraph: {
    siteName: "ArtisTech.Store",
    type: "website",
    images: [{ url: "/brand/logo.png", width: 288, height: 288, alt: "ArtisTech" }]
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0a08" },
    { media: "(prefers-color-scheme: light)", color: "#f7f3ea" }
  ],
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Set theme before paint to avoid a flash of the wrong mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("ats-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}`
          }}
        />
      </head>
      <body>
        <SiteHeader />
        <main className="container">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
