import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(() => {
  return {
    plugins: [vue()],
    clearScreen: false,
    envPrefix: ['VITE_'],
    server: {
      port: 1422,
      strictPort: true,
    },
    build: {
      sourcemap: false,
      target: 'es2020',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'pinia']
          }
        }
      }
    }
  }
})
