import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        root: './',
        include: ['tests/**/*.test.ts'],
        env: {
            DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/test_echoes_of_aion'
        }
    }
});
