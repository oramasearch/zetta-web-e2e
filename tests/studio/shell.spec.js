import { test, expect } from '@playwright/test'
import { signIn, VIEWS } from '../helpers/node.js'

// Rung 3 of the walkthrough ladder: prove the harness reaches a real node at all,
// and that the Studio shell is the shell the design specifies.
//
// These assert the SHELL CONTRACT — the nav groups and their order, the topbar
// utilities — not styling. Styling drift belongs to the parity project; this is
// "is the information architecture the one we agreed on".

test.describe('Studio shell', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('the five sidebar groups render, in the design order', async ({ page }) => {
    await page.goto('/?view=overview')

    // Workspace · Operate · Developer · Documentation · Advanced. The order is
    // the design's: the project lifecycle leads, infrastructure is demoted.
    const groups = page.locator('nav.side .group')
    await expect(groups).toHaveText([
      'Workspace',
      'Operate',
      'Developer',
      'Documentation',
      'Advanced',
    ])
  })

  test('Reports is one item under Data library, not a group of its own', async ({ page }) => {
    await page.goto('/?view=overview')

    const nav = page.locator('nav.side')
    // The design corrected this mid-branch (orama-design 74be8e1) and the
    // correction is the thing we imported, so it is the thing we pin.
    await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible()
    await expect(nav.locator('.group', { hasText: 'Reports' })).toHaveCount(0)

    const items = await nav.locator('a span').allTextContents()
    expect(items.indexOf('Data library')).toBeLessThan(items.indexOf('Reports'))
  })

  test('every view marks itself active in the nav', async ({ page }) => {
    // One assertion per route, so a broken route names itself rather than
    // failing a loop with an opaque index.
    for (const view of VIEWS) {
      await page.goto(`/?view=${view}`)
      await expect(
        page.locator(`nav.side a.active[href="/?view=${view}"]`),
        `${view} should be the active nav item`,
      ).toBeVisible()
    }
  })

  test('the page never requests an external asset', async ({ page }) => {
    // The self-contained page rule: an air-gapped node has no egress, so a
    // stylesheet or font from a CDN is a broken page in the field and a silently
    // working one on a laptop.
    const external = []
    page.on('request', (request) => {
      const url = request.url()
      if (!url.startsWith('http://127.0.0.1') && !url.startsWith('data:')) {
        external.push(url)
      }
    })

    await page.goto('/?view=overview')
    await page.waitForLoadState('networkidle')
    expect(external, `external requests: ${external.join(', ')}`).toHaveLength(0)
  })
})
