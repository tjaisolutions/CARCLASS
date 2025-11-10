import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to use our Express server as middleware in development
const expressApiPlugin = () => ({
  name: 'express-api-plugin',
  configureServer: async (server) => {
    // Dynamically import the Express app from server.mjs
    const { app } = await import('./server.mjs');
    
    // Mount the express app as middleware on the '/api' path.
    // This tells Vite to forward any request starting with '/api' to our Express server.
    // The Express server will then handle the rest of the path (e.g., '/data').
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
