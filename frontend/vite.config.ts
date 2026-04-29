import { execSync } from 'child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

let commitHash = '????'
try {
  commitHash = execSync('git rev-parse --short=4 HEAD').toString().trim()
} catch {
  // not in a git repo or no commits yet
}

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env['VITE_API_URL'] ?? 'http://localhost:4566',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
