import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function firebaseMessagingSwPlugin(env: Record<string, string>): Plugin {
  const swTemplate = fs.readFileSync(
    path.resolve(__dirname, 'public/firebase-messaging-sw.js'),
    'utf-8'
  )

  const buildSw = () =>
    swTemplate
      .replace('FIREBASE_API_KEY', env.VITE_FIREBASE_API_KEY || '')
      .replace('FIREBASE_AUTH_DOMAIN', env.VITE_FIREBASE_AUTH_DOMAIN || '')
      .replace('FIREBASE_PROJECT_ID', env.VITE_FIREBASE_PROJECT_ID || '')
      .replace('FIREBASE_STORAGE_BUCKET', env.VITE_FIREBASE_STORAGE_BUCKET || '')
      .replace('FIREBASE_MESSAGING_SENDER_ID', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
      .replace('FIREBASE_APP_ID', env.VITE_FIREBASE_APP_ID || '')

  return {
    name: 'firebase-messaging-sw',
    configureServer(server) {
      server.middlewares.use('/firebase-messaging-sw.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript')
        res.end(buildSw())
      })
    },
    writeBundle() {
      const out = path.resolve(__dirname, 'dist/firebase-messaging-sw.js')
      fs.writeFileSync(out, buildSw())
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Carregar env file baseado no modo (development/production)
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), firebaseMessagingSwPlugin(env)],
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            firebase: [
              'firebase/app',
              'firebase/auth',
              'firebase/firestore',
              'firebase/storage',
            ],
            charts: ['recharts'],
            pdf: ['jspdf', 'jspdf-autotable'],
            excel: ['xlsx'],
          },
        },
      },
    },
    define: {
      'process.env': env
    }
  }
})
