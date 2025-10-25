// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole: true,
  },
  images: {
    // Allow images from any domain without configuring remotePatterns/domains
    // (uses plain <img> behavior under the hood)
    unoptimized: true,
    formats: ["image/webp", "image/avif"],
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Misc project settings (keep or remove as you like)
  compress: true,
  trailingSlash: false,
};

export default nextConfig;
