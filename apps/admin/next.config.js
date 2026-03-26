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
    API_URL: process.env.API_URL || 'http://localhost:3002',
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  },
};

module.exports = nextConfig;
