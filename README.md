# zetta-web-e2e

Playwright end-to-end and **design-parity** suite for Orama Studio's web surface.

Tracking: [oramasearch/zetta#970](https://github.com/oramasearch/zetta/issues/970).
Driven by the **zetta-walkthrough** skill as its browser avenue.

## Two jobs

**1 · Walk the web UI.** Every `?view=` route renders, the nav marks the active
item, no console errors, **no external asset requests**, light and dark, desktop
and 375px — then the product spine as a real flow: land a dataset, ask in plain
language, run it, read the report, ask who is at risk, ask why.

**2 · Diff our surface against the deployed design.** Nav groups and their order,
entry-path titles and copy, screen titles, the vocabulary contract. Deliberately
**not** the things that should differ — the design renders fixtures, we render a
live node's real and often empty state.

The output of job 2 is a **parity report, not a pass/fail gate**. Divergence is
frequently correct: the design leads the engine on purpose. What must not happen
is divergence nobody knew about.

## Why Playwright, not Cypress

Job 2 compares `http://127.0.0.1:4800` against a Railway origin — **cross-origin
by definition**, which is Cypress's single documented weakest lane (one tab, no
native multi-origin). Two more reasons that decided it:

- **The trace is a file an agent can read.** This suite is driven by Claude Code
  through the walkthrough skill; Playwright's Trace Viewer beats a time-travel
  debugger a human has to watch.
- Free worker-based parallelism, and real WebKit for eventual Safari coverage.

Cypress's strongest lane — component testing — does not apply. zetta's web UI is
C++ server-rendered HTML with nothing to mount.

## Running it

```sh
npm install
npm run install:browsers

# a zetta node, and the owner bearer it prints ONCE at startup
export ZETTA_BASE_URL=http://127.0.0.1:4800
export ZETTA_TOKEN=<the 64-hex owner token>

npm run test:studio     # job 1
npm run test:parity     # job 2
npm run report          # the HTML report + traces
```

`.env.example` documents every variable.

## Two things that will bite you

- **`--listen` sets the node's PEER port, not its API port.** The web UI and MCP
  stay on **4800**. Point the suite at the peer port and every request returns
  nothing, which reads exactly like a dead node.
- **The web UI wants a session cookie, not the bearer.** `POST /session` takes
  the token in the **JSON body** — an `Authorization` header returns 401, which
  looks like a bad token rather than a wrong shape. `tests/helpers/node.js`
  handles it.

## Layout

```
playwright.config.js    three projects: studio · studio-mobile · parity
tests/studio/           job 1 — the web UI on a live node
tests/parity/           job 2 — the cross-origin diff against the design
tests/helpers/          sign-in, the view list, read-capability access
```

Reads are `GET`, actions are `POST`. Probing a read with POST returns an empty
reply indistinguishable from a hang — that misreading cost a whole issue once
([zetta#954](https://github.com/oramasearch/zetta/issues/954)).

## Retries are off, deliberately

A flaky walkthrough is a finding. Retrying until quiet hides exactly what this
suite exists to surface.
