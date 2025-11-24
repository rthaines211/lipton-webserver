import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Include shared components in React transformation
      include: [
        /\.[jt]sx?$/,
        path.resolve(__dirname, '../shared/**/*.tsx'),
        path.resolve(__dirname, '../shared/**/*.ts'),
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  base: '/intake/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      include: [/shared/, /node_modules/],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
