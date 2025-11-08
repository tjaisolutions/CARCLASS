import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to use our Express server as middleware in development
const expressApiPlugin = () => ({
  name: 'express-api-plugin',
  configureServer: async (server) => {
    // Dynamically import the Express app from server.mjs
    const { app } = await import('./server.mjs');
    
    // Use the express app as a middleware.
    // The express app itself is now responsible for handling the /api prefix,
    // so it won't interfere with Vite's handling of other routes like the root '/'.
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
