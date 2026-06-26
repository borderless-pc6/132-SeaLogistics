import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Carregar env file baseado no modo (development/production)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      host: true,
      proxy: {
        "/api": "http://localhost:3001",
        "/send-email": "http://localhost:3001",
        "/health": "http://localhost:3001",
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    // Expor todas as variáveis de ambiente que começam com VITE_
    define: {
      'process.env': env
    }
  }
})
