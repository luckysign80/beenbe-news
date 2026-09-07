import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/roboto-fontface/fonts/roboto/*.ttf"]
  }
};

export default nextConfig;
