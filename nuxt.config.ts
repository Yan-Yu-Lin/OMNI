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
    // Enable better-sqlite3 in Nitro
    externals: {
      inline: ['better-sqlite3'],
    },
  },
});
