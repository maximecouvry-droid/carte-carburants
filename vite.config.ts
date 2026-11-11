import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/carte-carburants/',
  plugins: [react()],
  test: { include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'] },
});
