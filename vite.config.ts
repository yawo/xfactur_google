import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_VISION_AI_BASE_URL': JSON.stringify(env.VISION_AI_BASE_URL),
      'import.meta.env.VITE_VISION_AI_API_KEY': JSON.stringify(env.VISION_AI_API_KEY),
      'import.meta.env.VITE_VISION_AI_MODEL': JSON.stringify(env.VISION_AI_MODEL),
      'import.meta.env.VITE_EXTRACTOR_AI_BASE_URL': JSON.stringify(env.EXTRACTOR_AI_BASE_URL),
      'import.meta.env.VITE_EXTRACTOR_AI_API_KEY': JSON.stringify(env.EXTRACTOR_AI_API_KEY),
      'import.meta.env.VITE_EXTRACTOR_AI_MODEL': JSON.stringify(env.EXTRACTOR_AI_MODEL),
      'import.meta.env.VITE_CONFORMITY_AI_BASE_URL': JSON.stringify(env.CONFORMITY_AI_BASE_URL),
      'import.meta.env.VITE_CONFORMITY_AI_API_KEY': JSON.stringify(env.CONFORMITY_AI_API_KEY),
      'import.meta.env.VITE_CONFORMITY_AI_MODEL': JSON.stringify(env.CONFORMITY_AI_MODEL),
      'import.meta.env.VITE_ALLOCATION_AI_BASE_URL': JSON.stringify(env.ALLOCATION_AI_BASE_URL),
      'import.meta.env.VITE_ALLOCATION_AI_API_KEY': JSON.stringify(env.ALLOCATION_AI_API_KEY),
      'import.meta.env.VITE_ALLOCATION_AI_MODEL': JSON.stringify(env.ALLOCATION_AI_MODEL),
      'import.meta.env.VITE_RECONCILIATION_AI_BASE_URL': JSON.stringify(env.RECONCILIATION_AI_BASE_URL),
      'import.meta.env.VITE_RECONCILIATION_AI_API_KEY': JSON.stringify(env.RECONCILIATION_AI_API_KEY),
      'import.meta.env.VITE_RECONCILIATION_AI_MODEL': JSON.stringify(env.RECONCILIATION_AI_MODEL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
