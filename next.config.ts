import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Disable React strict mode to prevent intentional double-invocation
   * of effects in development. This stops pages like Dashboard and
   * Assets from re-running their data-loading effects twice.
   */
  reactStrictMode: false,
};

export default nextConfig;
