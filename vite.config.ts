import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts')) return 'charts'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react')) return 'react'
          return 'vendor'
        },
      },
    },
  },
  plugins: [react()],
})
