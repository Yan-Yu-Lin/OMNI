// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  typescript: {
    strict: true,
  },

  css: ['~/assets/css/main.css'],

  // Vite configuration to improve HMR stability
  vite: {
    server: {
      // Increase HMR timeout to prevent premature disconnection on tab switch
      hmr: {
        timeout: 5000,
      },
    },
  },

  runtimeConfig: {
    // Server-only (not exposed to client)
    openrouterApiKey: '',
    firecrawlApiKey: '',
    firecrawlSelfHostedUrl: 'http://localhost:3002',

    // Public (exposed to client)
    public: {
      appName: 'AI Chat',
    },
  },

  nitro: {
    // Tell Nitro not to bundle better-sqlite3 (it's a native module)
    externals: {
      external: ['better-sqlite3'],
    },
  },
});
