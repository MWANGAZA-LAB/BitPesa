/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' for development
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Remove basePath and assetPrefix for local development
  // basePath: process.env.NODE_ENV === 'production' ? '/BitPesa' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/BitPesa/' : '',
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;