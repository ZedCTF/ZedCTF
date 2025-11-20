import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'  // ← Use SWC plugin

export default defineConfig({
  base: '/ZedCTF/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  }
})
