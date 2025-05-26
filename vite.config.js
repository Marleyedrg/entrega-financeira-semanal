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
        manualChunks: undefined, // Evita chunking desnecessário em desenvolvimento
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      },
      onwarn(warning, warn) {
        // Ignore source map warnings from browser extensions
        if (warning.code === 'SOURCE_MAP_ERROR' && warning.message.includes('moz-extension://')) {
          return;
        }
        warn(warning);
      }
    },
    sourcemap: true,
    // Ensure all resources use correct paths for GitHub Pages
    assetsInlineLimit: 4096, // Inline small assets under 4kb
    emptyOutDir: true, // Clean the output directory before building
  },
  optimizeDeps: {
    include: [] // Adicione dependências que precisam ser pré-bundled
  },
  css: {
    devSourcemap: true
  },
  // Add a custom script to the HTML to suppress source map warnings from browser extensions
  transformIndexHtml: {
    enforce: 'post',
    transform(html) {
      return html.replace('</head>', `
  <script>
    // Suppress source map errors from browser extensions
    const originalConsoleError = console.error;
    console.error = function(...args) {
      if (args.length > 0 && 
          typeof args[0] === 'string' && 
          (args[0].includes('moz-extension://') || 
           args[0].includes('Source map error') || 
           args[0].includes('purify.min.js.map'))) {
        return; // Suppress the error
      }
      originalConsoleError.apply(console, args);
    };
    
    // Dynamically handle base path for GitHub Pages
    document.addEventListener('DOMContentLoaded', function() {
      // Ensure all relative URLs work correctly when deployed to GitHub Pages
      const basePath = window.location.pathname.includes('/entrega-financeira-semanal/') 
        ? '/entrega-financeira-semanal/' 
        : '/';
      
      // Fix any API paths or resource paths if needed
      if (window.__APP_BASE_PATH === undefined) {
        window.__APP_BASE_PATH = basePath;
      }
    });
  </script>
</head>`);
    }
  }
}); 