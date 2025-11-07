import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to use our Express server as middleware in development
const expressApiPlugin = () => ({
  name: 'express-api-plugin',
  configureServer: async (server) => {
    // Dynamically import the Express app from server.mjs
    const { app } = await import('./server.mjs');
    
    // Use the Express app as middleware for all API requests
    server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api')) {
            // Let the express app handle it
            return app(req, res, next);
        }
        // Not an API call, let Vite handle it
        next();
    });
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
