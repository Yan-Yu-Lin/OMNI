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

    // Docker sandbox configuration
    dockerSandboxImage: 'ai-sandbox:latest',
    dockerSandboxTimeout: 30000, // Default command timeout (30s)
    dockerSandboxMaxOutput: 102400, // Max output size (100KB)
    dockerSandboxWorkspacePath: './data/sandboxes', // Where volumes are stored
    dockerSandboxIdleTimeout: 600000, // Idle timeout before stopping container (10 minutes)
    dockerSandboxCleanupInterval: 60000, // How often to check for idle containers (1 minute)

    // Public (exposed to client)
    public: {
      appName: 'AI Chat',
    },
  },

  nitro: {
    // Tell Nitro not to bundle native modules
    externals: {
      external: ['better-sqlite3', 'dockerode'],
    },
  },
});
