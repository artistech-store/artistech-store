/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage public URLs - set your project ref via env at deploy time.
      { protocol: "https", hostname: "**.supabase.co" }
    ]
  }
};

export default nextConfig;
