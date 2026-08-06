import { test, expect } from '@playwright/test'
import { signIn, VIEWS } from '../helpers/node.js'

// Rung 4: every `?view=` route renders, in both themes, with a clean console.
//
// One test per view rather than a loop, so a broken route names itself in the
// report instead of failing an opaque iteration — and so one bad view does not
// mask the twelve after it.

test.describe('every Studio route', () => {
  for (const view of VIEWS) {
    test(`${view} renders with a clean console`, async ({ page }) => {
      // Console errors are collected from before navigation, or the ones thrown
      // during load are missed entirely.
      const errors = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`))

      await signIn(page)
      const response = await page.goto(`/?view=${view}`)

      expect(response?.status(), `${view} should serve 200`).toBe(200)

      // "Renders" means the shell AND something in the content well. A view that
      // serves the chrome with an empty body is a broken view that returns 200.
      await expect(page.locator('nav.side')).toBeVisible()
      await expect(page.locator('.top .pagetitle')).toBeVisible()

      const main = page.locator('.layout')
      await expect(main).toBeVisible()
      expect(
        (await main.innerText()).trim().length,
        `${view} rendered no content`,
      ).toBeGreaterThan(0)

      // The engine's own "I do not know this view" state must not pass as a page.
      await expect(page.getByText('Unknown view.')).toHaveCount(0)

      expect(errors, `${view} console errors: ${errors.join(' | ')}`).toHaveLength(0)
    })
  }

  // Both themes are in the design contract, and the pre-paint pin in head()
  // means a theme bug shows as a flash or an unreadable page rather than an
  // error — so it has to be asserted, not eyeballed.
  for (const scheme of ['light', 'dark']) {
    test(`the shell is legible in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await signIn(page)
      await page.goto('/?view=overview')

      const body = page.locator('body')
      const { background, color } = await body.evaluate((element) => {
        const style = getComputedStyle(element)
        return { background: style.backgroundColor, color: style.color }
      })

      // Not a color assertion — a contrast one. Text the same color as its
      // background is the failure mode a theme bug actually produces.
      expect(background, `${scheme}: no background`).not.toBe('rgba(0, 0, 0, 0)')
      expect(color, `${scheme}: text is the same color as the background`).not.toBe(
        background,
      )
    })
  }
})
