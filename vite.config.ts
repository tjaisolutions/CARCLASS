import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to use our Express server as middleware in development
const expressApiPlugin = () => ({
  name: 'express-api-plugin',
  apply: 'serve', // Ensure this plugin only runs during development (vite serve), NOT build
  configureServer: async (server) => {
    // Dynamically import the Express app from server.mjs
    const { app } = await import('./server.mjs');
    
    // Mount the entire express app as middleware.
    // It will handle requests like /api/data on its own, making dev and prod consistent.
    server.middlewares.use(app);
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    expressApiPlugin(), // Add our custom plugin
  ],
  // The proxy is no longer needed as we are using middleware
})
