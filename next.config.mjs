/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // ASSUMPTION: backend/CDN image host is unknown at foundation stage.
    // Replace with the real ASP.NET Core API / CDN hostname once known.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
