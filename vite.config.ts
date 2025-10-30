import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ZedCTF/',  // 👈 very important for GitHub Pages
  plugins: [react()],
})
