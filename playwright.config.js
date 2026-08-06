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
  'https://oramadesign-system-reports-preview.up.railway.app/studio/'

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
      //
      // Chromium at 375px, NOT the iPhone preset: that preset runs WebKit, which
      // would conflate a narrow-layout failure with a rendering-engine
      // difference. Two questions, two projects — Safari coverage is `studio-webkit`.
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, baseURL: ZETTA },
    },
    // studio-webkit is OFF by default (zetta#970). Real WebKit is one of the
    // reasons this suite is Playwright, but on this Mac the bundled WebKit hangs
    // on bare `goto`, including a plain launch with no page — 30s timeouts on
    // every route while Chromium passes the same URLs in ~400ms. That is a
    // harness/environment problem, NOT evidence that Studio is broken in Safari,
    // and leaving 21 red tests in the suite would train everyone to ignore red.
    //
    // Re-enable with PW_WEBKIT=1 once the environment is sorted; do not delete
    // the project, because Safari coverage is a real requirement.
    ...(process.env.PW_WEBKIT
      ? [{
          name: 'studio-webkit',
          testDir: './tests/studio',
          use: { ...devices['Desktop Safari'], baseURL: ZETTA },
        }]
      : []),
    {
      name: 'parity',
      testDir: './tests/parity',
      use: { ...devices['Desktop Chrome'], baseURL: ZETTA },
      metadata: { designBaseUrl: DESIGN },
    },
  ],
})
