import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to use our Express server as middleware in development
const expressApiPlugin = () => ({
  name: 'express-api-plugin',
  configureServer: async (server) => {
    // Dynamically import the Express app from server.mjs
    const { app } = await import('./server.mjs');
    
    // Mount the Express app on the /api path.
    // This is cleaner and lets Vite's server handle routing correctly,
    // preventing the Express backend from hijacking the root '/' route.
    server.middlewares.use('/api', app);
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
