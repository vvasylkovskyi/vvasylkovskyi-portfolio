import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
