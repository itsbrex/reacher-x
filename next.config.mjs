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
};

export default nextConfig;
