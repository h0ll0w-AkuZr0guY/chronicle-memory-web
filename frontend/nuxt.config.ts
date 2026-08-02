export default defineNuxtConfig({
  compatibilityDate: '2026-07-22',
  ssr: false,
  devtools: { enabled: true },
  experimental: { typedPages: false },
  app: { baseURL: process.env.NUXT_APP_BASE_URL || '/' },
  runtimeConfig: { public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || '' } }
})
