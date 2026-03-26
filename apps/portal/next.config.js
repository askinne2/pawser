/** @type {import('next').NextConfig} */
const path = require('path');
const { config } = require('dotenv');

// Load environment variables from root .env file
config({ path: path.resolve(__dirname, '../../.env') });

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@pawser/database', '@pawser/shared', '@pawser/ui'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

module.exports = nextConfig;
