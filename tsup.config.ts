import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/reductstore/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
});
