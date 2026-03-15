import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Enables shadcn-style imports: "@/lib/utils", "@/components/ui/..."
      '@': path.resolve(__dirname, './src'),
    },
  },
})
