import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal Vite config. React plugin only. No backend; data persists in localStorage.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
