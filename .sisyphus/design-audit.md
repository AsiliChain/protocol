# AsiliChain — Redesign Audit

Colors reference from `packages/api/app/globals.css`:

| Token | Hex | Role |
|---|---|---|
| Forest Green `brand-600` | `#2D6A2D` | Primary brand |
| Coffee Brown `earth-700` | `#4B2E0A` | Secondary |
| Origin Gold `gold-500` | `#C8922A` | Accent (use sparingly) |
| Deep Navy `navy-800` | `#1A3557` | Dark backgrounds |
| Warm Cream (brand-spec) | OKLch(95.7% 0.012 80) | Page background |

Typography: Inter (Google Font) via brand-spec; currently system-ui only.  
Layout: brand-spec calls for "warm cream backgrounds, generous whitespace, fintech-premium."

---

## 1. Landing Page (`/`)

### Current
- Full-width navy bands (`bg-navy-800`), system-ui stack, emoji icons
- Pure Tailwind — no Inter font loaded

### Issues
1. **No Inter font** — brand-spec requires Inter for display + body. Pages fall back to system-ui.
2. **Emoji icons** — `🐦`, `📦`, `🤖` etc. render differently across OS. Inconsistent.
3. **Card backgrounds** — missing brand-spec "warm cream" (`--bg`). White cards on white feel flat.
4. **Gold under-used** — gold appears only on the hero highlight. CTAs and key stats should use gold sparingly for hierarchy.
5. **Coffee brown absent** — `earth-700` is secondary but never appears on landing.
6. **No real photography** — brand-spec wants coffee farm / farmer imagery. Heroes need visual anchor.
7. **Mobile nav** — `fixed` nav has no mobile hamburger. Menu items overflow on small screens.

### Recommendations
- Load Inter from Google Fonts (`@fontsource/inter` or via `<link>`)
- Replace emojis with inline SVG icons or a lightweight icon set (Lucide, ~15 icons)
- Add warm cream page background (`bg-[#F5F0EB]` or define as `--color-cream`)
- Use gold sparingly for primary CTA (Dashboard button) instead of brand-600
- Add hero imagery area — grey placeholder blocks per brand-spec where photos absent
- Add mobile hamburger / slide-out nav

---

## 2. Dashboard Home (`/dashboard`)

### Current
- 4 stat cards (emoji icons), portfolio donut + agent status grid, recent batches table
- `space-y-6` layout, white cards, navy borders

### Issues
1. **Emoji stat icons** — `📦💰💵🤖` inconsistent across platforms
2. **Portfolio donut label** — "Weighted avg LTV: X%" uses decimal formatting that can show `0.0%` when data pending — confusing
3. **Stat cards are flat** — no elevation, no visual hierarchy. All 4 cards equal weight.
4. **"Active Loans" stat** — should use gold accent to draw attention (most important KPI)
5. **Agent status cards** — cramped in 2-col grid, text-only, no visual distinction between agents
6. **No greeting / summary line** — dashboard lacks a human moment. A "Welcome back" or protocol summary adds warmth.

### Recommendations
- Replace emoji icons with Lucide SVGs (Package, DollarSign, Bot, Activity)
- Add subtle shadow/elevation to stat cards (`shadow-sm`)
- Use gold text for "Active Loans" value, green for "Total Lent"
- Agent cards: add colored left border or subtle icon per agent type
- Show "—" or "N/A" instead of `0.0%` when no active loans
- Add a small greeting bar above stats: "Coffee Supply Chain Finance • Mantle Sepolia"

---

## 3. Batches List (`/batches`) + Batch Detail (`/batches/[id]`)

### Current
- Data table with 7 columns, stage labels with color dots
- Stage timeline component on detail page (numbered circles)

### Issues
1. **Table is dense** — 7 columns on mobile is unusable. No horizontal scroll hint.
2. **Stage color dots overlap** — `stageColor()` returns inline styles, hard to distinguish
3. **Batch ID truncated** — `batchId.slice(0, 12)...` loses useful info. Tooltip or expand-on-hover needed.
4. **No filters or search** — 50+ batches with no way to filter by stage or farmer
5. **Stage timeline on mobile** — 7 circles with labels at `[10px]` font are nearly illegible
6. **Detail page** — no breadcrumb navigation back to batches list

### Recommendations
- Add `overflow-x-auto` wrapper with visible scrollbar on mobile
- Add search bar above table for batch ID / farmer wallet
- Use color-coded stage badges instead of dots (brand-100 bg with brand-700 text)
- Show full batch ID on hover via `title` attribute or expand
- Stack timeline vertically on mobile (< 640px) instead of horizontal
- Add breadcrumb: ⌂ Dashboard / Batches / Batch #{id}

---

## 4. Farmers List (`/farmers`) + Farmer Detail (`/farmers/[address]`)

### Current
- KNOWN_FARMERS list (3 cards), wallet search form below
- Detail page: wallet, credit score, active loans, farmer batches

### Issues
1. **All 3 farmers share the same wallet** — confusing visually. Need differentiator.
2. **Farmer cards are plain links** — no farmer photo/avatar placeholder per brand-spec
3. **Wallet search** — no input validation feedback
4. **Detail page loads sequentially** — `getFarmerInfo`, `getCreditScore`, `getLoans`, `getBatches` are sequential try/catch blocks, not parallel
5. **Credit score** — colored text only. No gauge/progress visualization.
6. **No farmer stats summary** — area, coop, registration date visible in contract but not displayed

### Recommendations
- Add colored avatar initials per farmer (Amina → green `A`, Joseph → gold `J`, Grace → brown `G`)
- Use brand-spec warm cream card backgrounds for farmer cards
- Add `pattern` attribute to wallet input for basic validation
- Parallelize detail page fetches with `Promise.all`
- Visualize credit score as a progress bar or gauge (green/yellow/red)
- Display farmer area (ha), registration date, and independent/coop status

---

## 5. Loans (`/loans`)

### Current
- 2 stat cards, loans table sorted by LTV descending
- Individual `readContract` per loan for batch data (sequential loop)

### Issues
1. **Sequential RPC** — `loans.map(async l => readContract(...))` in a for loop. Same pattern we fixed in dashboard.
2. **No loan status badge** — raw "Active/Defaulted" text blends in
3. **No pagination** — one table, could grow large
4. **Stat cards use brand-600** — loan stats should use gold or risk colors for emphasis
5. **LTV column** — no color coding. Should be red > 80%, yellow > 60%, green otherwise
6. **Interest column missing** — loan includes `interestUsdc` but table doesn't show it

### Recommendations
- Refactor to multicall pattern (matching `getPortfolioHealth()`)
- Add status badges with color: Active=green, Defaulted=red, Settled=gray
- Add pagination or virtual scroll for > 20 loans
- Apply LTV color coding to the LTV column cells
- Add interest column or show total repayment (principal + interest)
- Gold-accent the "Total Outstanding" value

---

## 6. AI Agents (`/agents`)

### Current
- Two cards per agent: identity card + report card with "Run Now" button
- Badge + StatusDot + CapabilityList sub-components

### Issues
1. **Duplicate card layout** — identity card and report card are separate but similar. Could merge.
2. **No agent avatar/icon** — text-only cards. Brand-spec wants visual anchors.
3. **Last run time** — dates are Unix timestamps or null. No relative time ("2 min ago").
4. **Report content is JSON blob** — displayed as raw text. Needs formatted report view.
5. **Color monotony** — both agents use identical card styles. No visual differentiation.

### Recommendations
- Merge identity + report into a single tabbed or expanded card per agent
- Add small icon per agent (shield for risk monitor, magnifying glass for anomaly detector)
- Format `lastRun` with a relative time helper
- Format report JSON into key-value display
- Use left border color to differentiate agents (risk=gold, anomaly=green)

---

## 7. CCIP Bridge (`/ccip`)

### Current
- 6 bridge info cards in 2-col grid, MantleScan link, "Back to Dashboard" link

### Issues
1. **Purely static** — hardcoded data in `BRIDGE_DATA` array. No on-chain verification.
2. **Emoji icons** — `🌐🎯🔀⬆️⬇️🪙`
3. **Contract addresses** — full address shown, unformatted. No copy-to-clipboard.
4. **No bridge status indicator** — is the bridge operational? Last transaction?
5. **Full address copy** — user can't easily copy a single address

### Recommendations
- Replace emojis with Lucide icons (Globe, Target, ArrowUp, ArrowDown, Coin)
- Add copy-to-clipboard button on each address
- Add a "status indicator" dot (green if bridge operational)
- Truncate addresses in display with full value on hover
- Consider adding a manual bridge trigger (Phase 2)

---

## 8. Layout: Sidebar + TopBar

### Current
- Fixed 256px sidebar with logo, 6 nav items, network badge
- Sticky top bar with "Dashboard" heading + MantleScan link

### Issues
1. **Emoji nav icons** — `▦👥📦💰🤖🌉`
2. **Sidebar is wide** — 256px on all screens. No collapse on tablets.
3. **No active page indicator** — the `aria-[current=page]` selector works but `TopBar` always says "Dashboard"
4. **TopBar title is static** — should reflect current page, not always "Dashboard"
5. **No mobile sidebar** — sidebar disappears on small screens with no hamburger
6. **Network badge** — "Mantle Sepolia" uses brand-50 bg but should use gold accent (testnet distinction)

### Recommendations
- Replace all emoji nav icons with Lucide SVGs (LayoutDashboard, Users, Package, DollarSign, Bot, Bridge)
- Make sidebar collapsible (icon-only mode at 64px) with a transition
- Make sidebar responsive — slide over on mobile with overlay
- Pass page title to TopBar via layout props or route-based mapping
- Gold-accent the network badge to signal "testnet"
- Highlight active nav item with left border accent

---

## Summary: Quick Wins vs Deep Rework

| Effort | Items |
|---|---|
| **Minute** (fix now) | Inter font, emoji→Lucide, copy-to-clipboard, relative time, LTV color, `0.0%`→`N/A` |
| **Moderate** (this sprint) | Stat card elevation, gold accents, stage badges, credit gauge, breadcrumbs, nav icons |
| **Big lift** (Phase 2) | Mobile responsive, photography, farmer detail parallelism, loan multicall refactor, agent merged cards |

---

## Brand Spec vs Current State

| Brand Spec | Current |
|---|---|
| Inter font | system-ui |
| Warm cream bg (`oklch(95.7% 0.012 80)`) | White bg everywhere |
| Gold accent for CTAs + highlights | Gold only on hero highlight text |
| Coffee brown secondary | Never used |
| Real photography | No imagery at all |
| Mono-styled numerics | Regular font-weight numbers |
| Sharp corners on hero, 8–12px radius on cards | `rounded-lg` (8px) throughout, hero has no corners |
