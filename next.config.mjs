import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

  // Ensure path alias '@' resolves to the project root in bundler
  webpack: (config) => {
    // Remove inner import; path is imported at top
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
