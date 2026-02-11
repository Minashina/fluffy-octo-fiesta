import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react', 'firebase/app', 'firebase/auth', 'firebase/firestore']
  },
  build: {
    commonjsOptions: {
      include: [/lucide-react/, /node_modules/]
    }
  }
})
