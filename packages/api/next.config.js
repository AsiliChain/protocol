/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  output: "standalone",
  experimental: {
    outputFileTracingRoot: require("path").resolve(__dirname, "../.."),
  },
};

module.exports = nextConfig;
