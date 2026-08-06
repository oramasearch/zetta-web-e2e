import { defineConfig, devices } from '@playwright/test'

// Two projects, because this suite has two jobs (oramasearch/zetta#970):
//
//   studio — walk Orama Studio's web UI on a live node
//   parity — put our surface and the DEPLOYED design side by side
//
// The parity project is why this is Playwright and not Cypress: comparing
// http://127.0.0.1:4800 against the Railway design is cross-origin by
// definition, and Cypress has no native multi-origin support.

const ZETTA = process.env.ZETTA_BASE_URL || 'http://127.0.0.1:4800'
const DESIGN =
  process.env.DESIGN_BASE_URL ||
  'https://oramadesign-system-production.up.railway.app/studio/'

export default defineConfig({
  testDir: './tests',
  // A failing walkthrough should say what happened, not be retried until quiet.
  // Retries hide exactly the flakiness this suite exists to surface.
  retries: 0,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // The trace is the artifact an agent can read — the reason this project is
    // Playwright. Keep it for anything that fails.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'studio',
      testDir: './tests/studio',
      use: { ...devices['Desktop Chrome'], baseURL: ZETTA },
    },
    {
      name: 'studio-mobile',
      testDir: './tests/studio',
      // 375px is in the design contract, so it is a project rather than a
      // one-off viewport override buried in a spec.
      use: { ...devices['iPhone 13'], baseURL: ZETTA },
    },
    {
      name: 'parity',
      testDir: './tests/parity',
      use: { ...devices['Desktop Chrome'], baseURL: ZETTA },
      metadata: { designBaseUrl: DESIGN },
    },
  ],
})
