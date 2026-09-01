/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: { domains: ["cdn.ozl.fashion"] },
};

module.exports = nextConfig;
