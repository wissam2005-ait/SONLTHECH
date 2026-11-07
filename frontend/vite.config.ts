import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, /api est redirigé vers le backend : pas de problème de CORS.
export default defineConfig({
  plugins: [react()],
server: { port: 5173, proxy: { '/api': 'http://localhost:8081' } },})
