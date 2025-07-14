/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel 환경에서 API 라우트 최적화
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '10mb',
  },
  // 실험적 기능 비활성화로 안정성 향상
  experimental: {
    serverComponentsExternalPackages: [],
  },
}
 
module.exports = nextConfig 