import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/chat": ["./src/data/**/*"],
  },
};

export default nextConfig;
