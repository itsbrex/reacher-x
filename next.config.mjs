/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.twimg.com",
        port: "",
        search: "",
      },
    ],
  },
  // Performance optimizations
  experimental: {
    // Enable optimizations for faster page loads
    optimizePackageImports: ["lucide-react"],
    // Enable faster refresh
    turbo: {
      rules: {
        "*.svg": {
          loaders: ["@svgr/webpack"],
          as: "*.js",
        },
      },
    },
  },
  // Enable compression for faster loading
  compress: true,
  // Optimize bundle size
  swcMinify: true,
  // Enable static optimization where possible
  trailingSlash: false,
  // Optimize font loading
  optimizeFonts: true,
};

export default nextConfig;
