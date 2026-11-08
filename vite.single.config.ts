import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds the whole app into one HTML file that opens by double-click (no server needed).
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: 'dist-single' },
})
