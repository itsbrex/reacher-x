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
      {
        protocol: "https",
        hostname: "9jnl6fmpas.ufs.sh",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
