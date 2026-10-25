import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  environment: 'node', include: ['tests/bookings.test.js', 'tests/booking-pos-handoff.test.js'], globalSetup: ['./tests/globalSetup.js'],
  setupFiles: ['./tests/setupEnv.js'], fileParallelism: false, testTimeout: 30000, hookTimeout: 120000,
} });
