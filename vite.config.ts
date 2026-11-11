import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/carte-carburants/',
  plugins: [react()],
  optimizeDeps: { exclude: ['maplibre-gl'] },
  test: { include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'] },
});
