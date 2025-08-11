import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 15000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    // Extended timeouts for backend integration tests with LLM calls
    taskTimeout: 120000,
    pageLoadTimeout: 20000,
    // Environment variables for backend testing
    env: {
      BACKEND_URL: 'http://localhost:8001',
      API_BASE_URL: 'http://localhost:8001/api'
    },
    // Retry configuration for flaky network requests
    retries: {
      runMode: 2,
      openMode: 0
    }
  }
});
