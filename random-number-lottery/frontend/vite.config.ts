import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@cedra-labs/wallet-adapter-core': path.resolve(__dirname, 'node_modules/@cedra-labs/wallet-adapter-core'),
      '@cedra-labs/wallet-adapter-plugin': path.resolve(__dirname, 'node_modules/@cedra-labs/wallet-adapter-plugin')
    }
  },
  optimizeDeps: {
    include: ['@cedra-labs/wallet-adapter-plugin']
  },
  build: {
    chunkSizeWarningLimit: 2000
  }
})
