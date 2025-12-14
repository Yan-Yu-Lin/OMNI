// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  typescript: {
    strict: true,
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      style: [
        {
          // Critical CSS for sidebar to prevent FOUC (Flash of Unstyled Content)
          // These styles are inlined in <head> so they're available immediately with HTML
          innerHTML: `
            .sidebar {
              width: 260px;
              min-width: 260px;
              background: linear-gradient(180deg, #faf8f5 0%, #f5f1ed 100%);
              box-shadow: 1px 0 8px rgba(0, 0, 0, 0.06);
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .sidebar.collapsed { width: 0; min-width: 0; }
            .sidebar-container { display: flex; flex-direction: column; height: 100%; }
            .sidebar-header { display: flex; align-items: center; gap: 8px; height: 56px; padding: 12px; }
            .sidebar-content { flex: 1; overflow-y: auto; }
            .sidebar-footer { display: flex; flex-direction: column; gap: 4px; padding: 12px; }
            .new-chat-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
            .sidebar-toggle-floating { position: absolute; top: 12px; left: 12px; z-index: 100; width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.9); display: flex; align-items: center; justify-content: center; }
            .footer-link { display: flex; align-items: center; gap: 10px; }
            .conversation-list { display: flex; flex-direction: column; }
          `,
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400;1,9..40,500&display=swap',
        },
      ],
    },
  },

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
