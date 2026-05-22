import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/chat": ["./src/data/**/*"],
  },
  async redirects() {
    return [
      {
        source: "/logbook",
        destination: "/history",
        permanent: true,
      },
      {
        source: "/bridge",
        destination: "/tutor",
        permanent: true,
      },
      {
        source: "/bridge/summary",
        destination: "/tutor/summary",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
