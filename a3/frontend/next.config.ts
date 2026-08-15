import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://a3-backend-0p1k.onrender.com"
    : "http://127.0.0.1:8000");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
