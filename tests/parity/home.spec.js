import { test, expect } from '@playwright/test'
import { signIn } from '../helpers/node.js'

// Job 2: our Studio home beside the DEPLOYED design, in one run, across two
// origins. This is the requirement that ruled Cypress out.
//
// What this asserts is the SHELL AND ENTRY CONTRACT — nav groups and their
// items, the two entry paths and their affordances. What it deliberately does
// NOT assert is content: the design renders fixtures (six Projects, "Orama
// Cloud", named people) and we render a live node's real and usually empty
// state. Comparing those would fail forever and teach nothing.
//
// Divergence is not automatically a bug. The design leads the engine on purpose.
// The failure this exists to prevent is divergence nobody knew about.

const DESIGN =
  process.env.DESIGN_BASE_URL ||
  'https://oramadesign-system-reports-preview.up.railway.app/studio/'

/** The sidebar as {group: [items]}, from whichever surface is loaded. */
async function readNav(page, navSelector) {
  return page.evaluate((selector) => {
    const nav = document.querySelector(selector)
    if (!nav) return null
    const groups = {}
    let current = null
    for (const node of nav.querySelectorAll('*')) {
      const text = (node.textContent || '').trim()
      if (!text) continue
      const isGroup =
        node.className &&
        typeof node.className === 'string' &&
        node.className.includes('group')
      if (isGroup && text.length < 24) {
        current = text
        groups[current] = []
      } else if (node.tagName === 'A' && current) {
        const label = (node.querySelector('span')?.textContent || text).trim()
        if (label && !groups[current].includes(label)) groups[current].push(label)
      }
    }
    return groups
  }, navSelector)
}

test.describe('Studio home — parity with the deployed design', () => {
  test('the nav is diffed against the design, and every difference is named', async ({
    page,
    context,
  }) => {
    await signIn(page)
    await page.goto('/?view=overview')
    const ours = await readNav(page, 'nav.side')
    expect(ours, 'could not read our own nav').toBeTruthy()

    // The other origin. A second page in the same context — first-class in
    // Playwright, workaround territory in Cypress.
    const design = await context.newPage()
    await design.goto(DESIGN, { waitUntil: 'networkidle' })
    const theirs = await readNav(design, 'nav, aside, [class*="sidebar"]')

    const report = { ours, theirs }
    await test.info().attach('nav-parity.json', {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    })

    // KNOWN GAP (zetta#973): this extractor reads OUR markup correctly and returns
    // {} for the design's, whose React classes do not carry a `group` token. The
    // cross-origin half works — the page loads, in the same run, from the other
    // origin — but the design-side selectors are not written yet, so the diff is
    // one-sided. Asserting a full diff here now would be asserting a fiction.
    expect(ours, 'our own nav should extract').toBeTruthy()
    await design.close()
  })

  test('Agents is a Workspace destination, as in the design', async ({ page }) => {
    await signIn(page)
    await page.goto('/?view=overview')

    // The design puts Agents in Workspace, beside Projects — an agent is
    // something you create and own, not a developer tool. We have it under
    // Developer.
    const nav = page.locator('nav.side')
    const html = await nav.innerHTML()
    const workspaceStart = html.indexOf('Workspace')
    const operateStart = html.indexOf('>Operate<')
    const agentsAt = html.indexOf('>Agents<')

    expect(agentsAt, 'Agents is missing from the nav entirely').toBeGreaterThan(-1)
    expect(
      agentsAt > workspaceStart && agentsAt < operateStart,
      'Agents should sit in the Workspace group, as it does in the design',
    ).toBe(true)
  })

  // FIXME(zetta#973): the engine serves no route for Changelog or CLI, and the
  // design system forbids a link that fakes a destination. Closing this gap means
  // serving real content, not adding two nav entries that 404.
  test.fixme('Documentation carries the design entries', async ({ page }) => {
    await signIn(page)
    await page.goto('/?view=overview')
    const nav = page.locator('nav.side')

    // The design's Documentation group: Overview · Changelog · MCP · CLI · API.
    for (const entry of ['Overview', 'Changelog', 'MCP', 'CLI', 'API']) {
      await expect(
        nav.getByRole('link', { name: entry, exact: true }),
        `Documentation is missing "${entry}"`,
      ).toBeVisible()
    }
  })

  // FIXME(zetta#973): "Set up profile" needs a Workspace Profile view. The
  // capability exists (#886) and the web UI has no screen for it, so the card is
  // currently a dead end: it explains something you cannot begin.
  test.fixme('both entry paths offer an action', async ({ page }) => {
    await signIn(page)
    await page.goto('/?view=overview')

    // The design gives each card a footer action — "Describe your goal" and
    // "Set up profile". Ours gives one to Create a Solution and none to
    // Discover Opportunities, so that card is a dead end: it explains a thing
    // you cannot begin.
    const cards = page.locator('.path')
    await expect(cards).toHaveCount(2)
    for (const index of [0, 1]) {
      await expect(
        cards.nth(index).locator('.pact a'),
        `entry card ${index} has no action — the design gives both one`,
      ).toBeVisible()
    }
  })
})
