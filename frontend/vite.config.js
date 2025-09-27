import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.trycloudflare.com', // All Cloudflare tunnels
      'based-slightly-springfield-excluded.trycloudflare.com', // Current Cloudflare URL
      '.ngrok.io',
      '.ngrok-free.app',
      '.loca.lt'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
