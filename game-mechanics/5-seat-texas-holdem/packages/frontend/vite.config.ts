import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || './'

  return {
    base,
    plugins: [react()],
    server: {
      allowedHosts: true, // Allow ngrok and other tunneling services
    },
    resolve: {
      alias: {
        // Fix for @cedra-labs/wallet-adapter-plugin resolution issue
        '@cedra-labs/wallet-adapter-plugin': resolve(
          __dirname,
          'node_modules/@cedra-labs/wallet-adapter-plugin/dist/index.mjs'
        ),
      },
    },
    optimizeDeps: {
      include: [
        '@cedra-labs/wallet-adapter-core',
        '@cedra-labs/ts-sdk',
        '@cedra-labs/wallet-standard',
      ],
    },
    build: {
      chunkSizeWarningLimit: 1200, // Cedra SDK is ~1MB, can't be split further
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks for better caching
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-cedra': ['@cedra-labs/ts-sdk', '@cedra-labs/wallet-adapter-core'],
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
  }
})
