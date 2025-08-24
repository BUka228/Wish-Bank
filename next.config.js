/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['node-telegram-bot-api']
  },
  env: {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    POSTGRES_URL: process.env.POSTGRES_URL || '',
    VERCEL_URL: process.env.VERCEL_URL || ''
  }
}

module.exports = nextConfig