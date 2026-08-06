import { expect } from '@playwright/test'

// Every `?view=` route the Studio web UI serves. Kept here rather than inline so
// a new view is added in one place and every route-shaped spec picks it up.
export const VIEWS = [
  'overview',
  'projects',
  'data',
  'reports',
  'models',
  'pipeline',
  'observability',
  'governance',
  'cluster',
  'connections',
  'shell',
  'notebooks',
  'agents',
  'chat',
  'datagen',
]

/**
 * Put the browser into a signed-in session.
 *
 * The bearer token is for the API and MCP; the web UI wants a `zetta_session`
 * cookie, which is a different thing. `POST /session` exchanges one for the
 * other — doing it over the API rather than typing into the login form keeps
 * these specs about the product instead of about the login page. The login form
 * gets its own spec.
 */
export async function signIn(page) {
  const token = process.env.ZETTA_TOKEN
  expect(
    token,
    'ZETTA_TOKEN is unset — the owner bearer is printed once at node startup; see .env.example',
  ).toBeTruthy()

  // The token goes in the BODY, not an Authorization header (#884). The header
  // form returns 401 and reads like a bad token rather than a wrong shape.
  const response = await page.request.post('/session', {
    data: { token },
  })
  expect(
    response.ok(),
    `POST /session failed (${response.status()}) — is the node up on ${process.env.ZETTA_BASE_URL || 'http://127.0.0.1:4800'}?`,
  ).toBeTruthy()
}

/**
 * Call a read capability. Reads are GET and actions are POST — probing a read
 * with POST returns an empty reply that looks exactly like a hung node, which
 * cost a whole issue once (zetta#954).
 */
export async function read(page, capability, params = {}) {
  const query = new URLSearchParams(params).toString()
  const response = await page.request.get(
    `/v1/${capability}${query ? `?${query}` : ''}`,
    { headers: { Authorization: `Bearer ${process.env.ZETTA_TOKEN}` } },
  )
  expect(response.ok(), `${capability} failed: ${response.status()}`).toBeTruthy()
  return response.json()
}
