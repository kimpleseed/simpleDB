/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 실험적 기능 비활성화로 안정성 향상
  experimental: {
    serverComponentsExternalPackages: [],
  },
}
 
module.exports = nextConfig 