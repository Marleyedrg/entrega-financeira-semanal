import { defineConfig } from 'vite';

export default defineConfig({
  base: '/entrega-financeira-semanal/',
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false // Desativa o overlay de erro padrão para usar nosso próprio sistema de notificação
    },
    watch: {
      usePolling: true, // Melhor compatibilidade em alguns sistemas
      interval: 100 // Intervalo de polling mais rápido
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false // Mantém console.logs em desenvolvimento
      }
    },
    rollupOptions: {
      output: {
        manualChunks: undefined // Evita chunking desnecessário em desenvolvimento
      },
      onwarn(warning, warn) {
        // Ignore source map warnings from browser extensions
        if (warning.code === 'SOURCE_MAP_ERROR' && warning.message.includes('moz-extension://')) {
          return;
        }
        warn(warning);
      }
    },
    sourcemap: true
  },
  optimizeDeps: {
    include: [] // Adicione dependências que precisam ser pré-bundled
  },
  css: {
    devSourcemap: true
  }
}); 