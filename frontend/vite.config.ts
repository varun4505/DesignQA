import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'plugin' ? viteSingleFile() : null
  ].filter(Boolean),
  build: {
    outDir: mode === 'plugin' ? '../plugin/dist' : 'dist',
    emptyOutDir: mode === 'plugin' ? false : true,
    rollupOptions: {
      input: mode === 'plugin' ? 'index.html' : 'index.html'
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
  },
  server: {
    port: 3000
  }
}))
