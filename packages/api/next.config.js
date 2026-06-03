/** @type {import('next').NextConfig} */
const path = require("path");
const nextConfig = {
  experimental: {},
  webpack: (config) => {
    config.resolve.alias["@/api"] = path.join(__dirname, "app/api");
    return config;
  },
};

module.exports = nextConfig;
