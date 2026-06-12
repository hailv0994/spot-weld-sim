import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// occt-import-js là CommonJS — PHẢI để esbuild pre-bundle (include) để có default export
// interop đúng. File .wasm được nạp riêng qua import '...?url' nên không cần exclude.
//
// base: './' khi build → đường dẫn asset TƯƠNG ĐỐI, chạy được trên GitHub Pages dù
// repo đặt ở subpath (user.github.io/<repo>/) mà không cần biết tên repo. Dev giữ '/'.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  optimizeDeps: {
    include: ['occt-import-js'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5180,
    open: true,
  },
}));
