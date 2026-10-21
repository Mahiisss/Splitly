import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Our shared packages ship TypeScript source, so Next compiles them for us.
  transpilePackages: ["@splitly/core", "@splitly/theme"],
};

export default nextConfig;
