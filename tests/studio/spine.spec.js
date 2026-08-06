import { test, expect } from '@playwright/test'
import { signIn, read } from '../helpers/node.js'

// Rung 5: the product spine, in a browser, as a person walks it —
// #948's eight-step script rather than a tour of routes.
//
// These specs assert what a PERSON can see and do. The capability-level
// equivalents live in the engine's own journey tables; the point of doing it
// again here is that a capability can be perfect over MCP and unreachable in
// the UI, and only this avenue catches that.

test.describe('the product spine', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('a fresh node says what to do, rather than showing nothing', async ({ page }) => {
    // The empty state is the first thing a new user meets. "No data" tells them
    // nothing; naming what produces the thing is the whole job of the screen.
    await page.goto('/?view=reports')
    const body = await page.locator('.layout').innerText()
    expect(body).toMatch(/run/i)
    expect(body).not.toMatch(/^no data$/im)
  })

  test('Reports lists what a run found, and says so when there is nothing', async ({ page }) => {
    await page.goto('/?view=reports')
    await expect(page.locator('.top .pagetitle')).toContainText('Reports')

    const runs = await read(page, 'list_runs').catch(() => null)
    const reportRuns = (runs?.value?.runs || runs?.runs || []).filter((run) =>
      (run.outputs || []).some((output) => output.kind === 'report'),
    )

    if (reportRuns.length === 0) {
      // Honest empty state, not a blank panel.
      await expect(page.getByText(/No run has produced a report yet/i)).toBeVisible()
    } else {
      // Every listed report opens, and the report itself renders.
      const first = page.locator('.workrow').first()
      await expect(first).toBeVisible()
      await first.click()
      await expect(page.locator('.top .pagetitle')).toContainText('Report')
    }
  })

  test('the chat surface offers both asking and building', async ({ page }) => {
    // Step 3 of the script — "ask in plain language" — is reachable from the UI
    // through this form. Send talks; Build & run compiles a Pipeline and runs it.
    await page.goto('/?view=chat')
    await expect(page.locator('textarea[name="message"]')).toBeVisible()
    await expect(page.locator('button[value="chat"]')).toBeVisible()
    await expect(page.locator('button[value="agent_run"]')).toBeVisible()
  })

  test('an agent is required before anything conversational, and the UI says so', async ({
    page,
  }) => {
    // A fresh node has zero agents, which the #948 script never mentions. If
    // that is the state, the screen has to name it — otherwise the first thing
    // a new user meets is a form that cannot work.
    const agents = await read(page, 'list_agents')
    const count = (agents?.value?.agents || agents?.agents || []).length

    await page.goto('/?view=chat')
    if (count === 0) {
      const body = await page.locator('.layout').innerText()
      expect(
        /agent/i.test(body),
        'with no agents served, the chat screen should say so',
      ).toBe(true)
    } else {
      await expect(page.locator('select[name="agent"] option')).not.toHaveCount(0)
    }
  })

  test('Data library is where a dataset would appear', async ({ page }) => {
    await page.goto('/?view=data')
    await expect(page.locator('.top .pagetitle')).toContainText('Data')
    const body = await page.locator('.layout').innerText()
    expect(body.trim().length).toBeGreaterThan(0)
  })

  test('Connections offers a way to save one', async ({ page }) => {
    // Step 1 of the script. The credential must never come back out — that is
    // asserted at the capability layer; here it is simply reachable.
    await page.goto('/?view=connections')
    const body = await page.locator('.layout').innerText()
    expect(body).toMatch(/connection/i)
  })
})
