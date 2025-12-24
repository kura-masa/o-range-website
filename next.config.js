/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  // 動的ルートのフォールバック設定
  trailingSlash: false,
  // Firebase Storage の undici 互換性問題を解決
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドビルドでNode.js専用モジュールを除外
      config.resolve.alias = {
        ...config.resolve.alias,
        undici: false,
      }
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        util: false,
      }
    }
    // undiciモジュールを完全に無視
    config.externals = config.externals || []
    config.externals.push({
      undici: 'undici',
    })
    return config
  },
}

module.exports = nextConfig
