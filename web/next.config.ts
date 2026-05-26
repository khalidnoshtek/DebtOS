import type { NextConfig } from "next";

const isGhPages = process.env.GITHUB_PAGES === "true";
const repo = "DebtOS";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isGhPages ? `/${repo}` : "",
  assetPrefix: isGhPages ? `/${repo}/` : "",
};

export default nextConfig;
