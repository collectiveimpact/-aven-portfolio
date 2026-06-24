import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks /_next/* dev resources (HMR + client chunks) when the browser
  // origin doesn't match the dev server's canonical host. Without this, opening
  // the dev server via 127.0.0.1 or a LAN IP silently fails to hydrate (HMR
  // WebSocket is blocked) → no client interactivity. Allow the common local
  // hosts so `pnpm dev` works however it's reached. Dev-only; ignored in prod.
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
};

export default nextConfig;
