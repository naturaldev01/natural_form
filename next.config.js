/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'qdfewglxhqyvrmcflsdj.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;

