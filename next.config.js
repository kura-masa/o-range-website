/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  // 動的ルートのフォールバック設定
  trailingSlash: false,
  // 環境変数をクライアントサイドで利用可能にする
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
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
