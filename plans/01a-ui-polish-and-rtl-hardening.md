# SponsorSync Plan 1a: UI Polish, RTL Hardening, and User-Management Contract Fixes

This is a follow-up plan to `01-foundation-auth-and-agent-workflow.md`. It does not add features. It repairs the user-management API contract, fixes the RTL foundation, makes the authenticated shell accessible, and gives the application a visual identity of its own.

Scope is limited to Plan 1 surfaces: the app shell (navbar + sidebar), the profile page, the users page, and the backend endpoints that serve them. Plan 2 surfaces (events, companies, teams) are out of scope. Discoveries outside this scope go in _Surprises and Discoveries_, not into the diff.

This is a living execution document. Update **Progress**, **Surprises and Discoveries**, **Decision Log**, and **Outcomes and Retrospective** as work proceeds.

## Why this plan exists

An audit of the four Plan 1 surfaces scored **8/20**. Two of the findings are not design problems at all — they are functional defects that were invisible because the failure is an Arabic error toast that looks intentional:

1. `GET /api/users` rejects the request the client actually sends. The client always sends `role=&status=`; the Zod schema is `z.enum([...]).optional()`, which rejects `''`. Verified by running the real schema against the real params — **the users page has never successfully loaded**.
2. Even with that fixed, the status filter would still fail: the client sends `status=disabled`, the server accepts only `active | inactive`.

Everything else in the audit is real but secondary. Fix the contract first; there is no point styling a table that returns 400.

## Fixed decisions for this plan

- No new production dependencies except `stylis-plugin-rtl` (~2 KB, the officially documented MUI RTL setup). Everything else uses MUI v6, framer-motion, and the theme that already exists.
- No TypeScript, no CSS-in-file — the project styles through the MUI theme and `sx`. That stays.
- The MUI theme in `client/src/main.jsx` becomes the single source of design tokens. Components stop carrying hex literals.
- Arabic is the interface language. Every user-visible string, including role names, is Arabic.
- No API-shape changes that Plan 2+ would have to migrate. Additive fields only.

## Skills applied, and which were deliberately not

| Skill                                                                                                                                                         | Used for              | Why                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **impeccable** (`harden`, `colorize`, `typeset`, `clarify`, `adapt`, `polish`)                                                                                | Drives Milestones 2–7 | Product-register command set; the audit that produced this plan came from it                                                                                                                                                                                                                                                                                                        |
| **frontend-design**                                                                                                                                           | Milestone 4 only      | The one genuinely open question is visual identity. This skill is about aesthetic direction, which is exactly that decision                                                                                                                                                                                                                                                         |
| **ponytail**                                                                                                                                                  | Throughout            | Roughly 260 lines come out across this plan. Every milestone below states what it deletes                                                                                                                                                                                                                                                                                           |
| **vercel-react-best-practices**                                                                                                                               | Milestones 2 and 6    | Narrow slice only — `rerender-no-inline-components`, `rerender-derived-state-no-effect`, `bundle-barrel-imports`. Most of the skill is Next.js/RSC and does not apply to a Vite SPA                                                                                                                                                                                                 |
| **nodejs-backend-patterns** + **sequelize**                                                                                                                   | Milestone 1           | Validator coercion, additive field exposure, query shape                                                                                                                                                                                                                                                                                                                            |
| **security-review**                                                                                                                                           | Milestone 1           | Admin-set temporary passwords currently accept a 1-character string                                                                                                                                                                                                                                                                                                                 |
| **design-taste-frontend**                                                                                                                                     | 4 rules only          | Its own scope line reads: _"Landing pages, portfolios, and redesigns. **Not dashboards, not data tables, not multi-step product UI.**"_ That is precisely what this is. Applying it wholesale would be cargo-culting. The four transferable rules — Color Consistency Lock, Shape Consistency Lock, Form Contrast Check, Interactive UI States — are folded into Milestones 4 and 6 |
| _Not used:_ `motion-framer`, `animation-vocabulary`, `improve-animations`, `find-animation-opportunities`, `apple-design`, `ui-ux-pro-max`, `pick-ui-library` | —                     | The product register calls for 150–250 ms state transitions and nothing else. Three motion skills and a component-library picker for an app that already picked MUI is over-tooling                                                                                                                                                                                                 |

---

## Milestone 1: Repair the user-management contract

**Backend. Nothing in this plan can be verified until this lands.**

### Tasks

1. **`server/src/validators/userValidators.js`** — make optional enums tolerate the empty string, and align the status vocabulary with the client:
   - `role: z.preprocess((v) => (v === '' ? undefined : v), ROLE_ENUM.optional())`
   - `status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['active', 'disabled']).optional())`
   - `search: z.string().trim().max(100).optional()` — and preprocess `''` to `undefined` so a blank search does not produce `%%` in the `iLike`.
2. **`server/src/services/userService.js`** — `listUsers` maps `status === 'disabled'` to `isActive: false`. Rename from `inactive` so one word means one thing across the stack.
3. **`server/src/validators/userValidators.js`** — `temporaryPassword` gets the same policy the self-service change-password flow enforces. Read `authValidators.js` and reuse the schema; do not write a second policy. An admin can currently set a user's password to `a`.
4. **`server/src/utils/safeUser.js`** — add `createdAt` and `lastLoginAt`. Both already exist on the model; `lastLoginAt` is written on every login and has never been exposed. This unblocks Milestones 5 and 6.
   - Do **not** add `tokenVersion`. See task 5.
5. **`client/src/pages/ProfilePage.jsx`** — remove the "إصدار الجلسة: v0" row. `safeUser` strips `tokenVersion` by design (it is a security primitive), so `user.tokenVersion || 0` has always rendered `v0`. It is dead UI showing developer jargon. Replaced in Milestone 5 by "آخر تسجيل دخول".
6. **`server/src/services/userService.js`** — extract the four repeated `findByPk(actor.id)` FK-guard blocks into one `resolveActorId(actor)` helper. Same behavior, ~24 lines out.

### Deletes

~30 lines (actor-guard duplication, the dead profile row).

### Validation

- `npm run test -w server` passes.
- New test: `listUsersQuerySchema` accepts `{page:'1', pageSize:'20', search:'', role:'', status:''}` and `{status:'disabled'}`. This is the regression that the whole plan hinges on — it gets a test.
- Manual: log in as admin, open `/app/users`, see rows. Set the status filter to «معطل», see it filter.

---

## Milestone 2: RTL foundation and the token layer

**This is the highest-leverage milestone. It deletes more than it adds and unblocks 3, 6, and 7.**

### Tasks

1. `npm i stylis-plugin-rtl -w client`. Wrap the app in an Emotion `CacheProvider`:
   ```js
   createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] });
   ```
   `direction: 'rtl'` is already on the theme and `<html dir="rtl">` is already set — the Emotion half was the missing piece the whole time.
2. **Delete the workarounds it replaces** in `main.jsx`: the entire `MuiInputLabel` override block (`right: 16 / left: auto / transformOrigin: top right`), the `MuiInputAdornment` block with its eight `!important` declarations, and `fieldset legend { display: none }`. These exist only because MUI's CSS was never being flipped. Roughly 50 lines.
3. Verify the two components that are visibly wrong today and cannot be hand-patched: `TablePagination` arrows and `Switch`.
4. **Extend the theme into a real token set** so components have something to reference:
   - `palette.text.disabled`, `palette.action.hover`, `palette.action.selected`
   - `palette.success` / `error` / `warning` with **AA-passing** `main` values (see Milestone 4)
   - `shape.borderRadius` — one value, per the Shape Consistency Lock. Today the code mixes `8px`, `10px`, and `12px` with no rule.
   - Component defaults for `MuiCard`, `MuiPaper`, `MuiTableCell`, `MuiChip` so pages stop restating `border: 1px solid #e4e4e7` fourteen times.

### Deletes

~50 lines of RTL workaround, plus `inputStyles` in `UsersPage.jsx` (~11 lines) which duplicates what the theme's `MuiOutlinedInput` already sets and is spread across 8 fields.

### Validation

- `npm run build -w client` clean.
- Manual: open a create-user dialog, confirm the floating label sits right and animates correctly **without** the deleted overrides. Confirm `TablePagination` arrows point the right way.

---

## Milestone 3: Accessibility — keyboard, semantics, modal behavior

`/impeccable harden`

### Tasks

1. **Sidebar navigation is keyboard-unreachable.** `AppShell.jsx:168` renders nav items as `<Box component={motion.div} onClick>` — no role, no `tabIndex`, no key handler, no focus ring. Convert to `motion.button` (or MUI `ButtonBase`), wrap groups in `<nav>` / `<ul>` / `<li>`, add `aria-current={isActive ? 'page' : undefined}`, and give a visible `:focus-visible` ring from the token layer. **WCAG 2.1.1 (A) and 4.1.2 (A).**
2. **Replace the hand-rolled mobile drawer** (`AppShell.jsx:430–472`) with `<Drawer anchor="right" variant="temporary">`. The current version has no focus trap, no Escape-to-close, no focus restoration, no `aria-modal`, and no body scroll lock — and its `AnimatePresence` direct child is a plain MUI `Box` with no `key`, so exit animation is unreliable. The three commits in git history fighting the slide direction were fighting the missing RTL cache, which Milestone 2 fixes. **~45 lines out.**
3. **Extract `renderSidebarContent` out of the component body.** It is a function defined inside `AppShell` that returns JSX — `rerender-no-inline-components`. Make it a `SidebarNav` component in the same file taking `{ collapsed, onNavigate }`.
4. **Per-row action labels.** Every edit button in the users table has the identical `aria-label="تعديل المستخدم"`; a screen reader announces twenty indistinguishable buttons. Interpolate the user's name into edit, reset, and the status `Switch`.
5. **Dialog labelling.** All three dialogs need `aria-labelledby` pointing at their `DialogTitle` id. MUI does not wire this automatically.
6. **Touch targets.** Hamburger, collapse toggle, avatar, and row icon buttons are all `size="small"` (~34 px). Raise interactive targets to ≥40 px, and raise the navbar from 48 px to 56 px so they fit. Fix the `pt: '64px'` / `height: 48` mismatch in the same pass.

### Deletes

~45 lines (drawer), plus the `AnimatePresence` backdrop and spring config.

### Validation

- Tab from the top of the page through the entire sidebar, activate each item with Enter and Space, confirm a visible focus ring on each.
- Open the mobile drawer, press Escape, confirm it closes and focus returns to the hamburger.
- `npm run test -w client` — add one render test asserting nav items expose `role="link"`/`button` and `aria-current`.

---

## Milestone 4: Visual identity — color and type

`/impeccable colorize` → `/impeccable typeset`, with **frontend-design** driving the direction.

### Direction (decided 2026-07-24)

**Keep zinc as the neutral. Add one accent: deep oxblood.**

The current palette is `#09090b` ink on `#fafafa`, `#e4e4e7` borders, `#f4f4f5` hover, black pill active state — shadcn's zinc scale, unmodified. Zinc itself is a well-built ramp and replacing it is a large diff for no gain. The tell is not zinc; it is zinc shipped in its **default state** with no accent at all, while three unrelated colors (`#10b981`, `#ef4444`, `#f59e0b`) appear on chips and one icon hover belonging to no system.

Teal and violet were ruled out as the two saturated LLM defaults. Green, red, and amber were ruled out because they are already spoken for by status semantics and the brand cannot also be the warning color. Oxblood is deep, formal, reads to a contracts-and-sponsorship domain, and no admin UI goes there — everyone defaults to blue.

**Tokens:**

| Role                           | Value                          | Contrast                                                  |
| ------------------------------ | ------------------------------ | --------------------------------------------------------- |
| `primary.main`                 | `#9f1e42`                      | 7.67:1 vs white — white `contrastText` passes comfortably |
| `primary.dark` (hover/pressed) | `#7d1734`                      | —                                                         |
| Selected-row / subtle surface  | `#fdf1f4`                      | warm tint, clearly distinct from `#fafafa`                |
| Focus ring                     | `rgba(159, 30, 66, 0.35)`, 3px | —                                                         |

**Usage budget: ~10% of surface, three placements only** — primary buttons, the active nav item (replaces the black pill), and focus rings. Nothing decorative. Product register floor is Restrained and this stays inside it.

### Tasks

1. Apply the **Color Consistency Lock**: the oxblood above is the only accent in the application. If a fourth color appears anywhere in a later diff, that diff is wrong.
2. **Fix the four contrast failures** (all WCAG 1.4.3 AA, ratios computed against the actual backgrounds in the code):

   | Element              | Current                | Ratio      | Needs                           |
   | -------------------- | ---------------------- | ---------- | ------------------------------- |
   | Sidebar group header | `#a1a1aa` on `#fff`    | **2.56:1** | 4.5:1                           |
   | Active chip «نشط»    | `#10b981` on `#f4f4f5` | **2.33:1** | 4.5:1 (→ `#047857`, see task 3) |
   | Disabled chip «معطل» | `#ef4444` on `#f4f4f5` | **3.42:1** | 4.5:1 (→ zinc, see task 3)      |
   | Breadcrumb `/`       | `#d4d4d8` on `#fff`    | **1.70:1** | 3:1                             |

3. **Re-scope the status chips so red stops meaning two things.** The oxblood accent sits close enough to a bright error red to be confusable if they ever appear together. Rather than tuning hues apart, fix the semantics — a disabled account is not an error, it is a neutral state:
   - «نشط» → `#047857` on a light green tint, **filled**
   - «معطل» → zinc `#52525b` on `#f4f4f5`, **outlined**
   - Error red stays reserved for actual failures (alerts, validation), where it never sits beside the accent.

   This also satisfies **WCAG 1.4.1**: today the two chips are identical grey pills separated only by hue, so a colorblind admin sees no difference. Filled-vs-outlined carries the distinction without relying on color.

4. Delete the orphan `#f59e0b` hover on the reset-password icon button. Amber now means warning and nothing else.
5. **Typography.** Two defects, both Arabic-specific:
   - `letterSpacing: -0.5` / `-0.3` appears on «الملف الشخصي», «إدارة المستخدمين», and the brand mark. **Arabic is a connected script** — negative tracking damages the letter joins. It is a Latin-display reflex misapplied. Set to `normal` on all Arabic text.
   - `fontWeight: 800` is used in 9 places, but `index.html` loads IBM Plex Sans Arabic at `300;400;500;600;700`. Every one of those is browser-synthesized fake bold, which degrades Arabic more visibly than Latin. Either cap at 700 or add `800` to the font request — **cap at 700**, since 700 is already plenty of contrast at these sizes.
   - Tighten the heading scale. `variant="h4"` (34 px) page titles against 56 px chrome is oversized for product UI; the register wants a 1.125–1.2 ratio and a fixed rem scale, not fluid.
6. Self-host the font or at minimum keep `display=swap` (already correct) — but note the `<link>` to Google Fonts is a third-party render-blocking request. Optional, low priority.

### Validation

- Every changed pair re-measured to ≥4.5:1 (body) / ≥3:1 (large).
- Grep the client for `letterSpacing: -` — must return nothing on Arabic text.
- Grep for `fontWeight: 8` — must return nothing.
- Screenshot the four surfaces before/after.

---

## Milestone 5: Profile page

`/impeccable clarify`

The page currently shows two facts, one of which is dead (Milestone 1, task 5). It is a card wrapping a two-row label list with a button.

### Tasks

1. Replace the removed session-version row with **«آخر تسجيل دخول»** using `lastLoginAt` (exposed in Milestone 1) and **«تاريخ الإنشاء»** using `createdAt`. Format dates in Arabic with `Intl.DateTimeFormat('ar', ...)` — no date library.
2. Fixed `width: 120` on the label column (`ProfilePage.jsx:100`) has no wrap handling; long emails overflow on mobile. Use a two-column grid that collapses to stacked below `sm`.
3. Arabic role label, from the single source fixed in Milestone 7.
4. The user cannot edit their own name anywhere in the application. **Out of scope** — log in _Surprises and Discoveries_ with a note that it needs a `PATCH /api/auth/me` endpoint, and let the team decide whether it belongs to Plan 1 or Plan 2.

### Validation

Render at 360 px and 1280 px; no overflow, no truncated email.

---

## Milestone 6: Users page — states and interaction

`/impeccable harden` + `/impeccable adapt`, with design-taste-frontend's **Interactive UI States** rule.

### Tasks

1. **Search does nothing until you click «تطبيق».** There is no form, so Enter does not submit either, and nothing signals that the button is required. Replace with a 300 ms debounced search on change; delete the button and the `filterVersion` counter that exists only to trigger the effect (`rerender-derived-state-no-effect`). Reset `page` to 1 on filter change — the current code forgets to.
2. **`Grid item xs={12} sm={1}`** gives the apply button one twelfth of the row (~45 px) with the word «تطبيق» inside it at the `sm` breakpoint. Moot once the button is deleted, but audit the remaining grid at every breakpoint.
3. **Loading is a text row.** Replace with a `Skeleton` table matching the final row shape — product register calls for skeletons, not spinners or text.
4. **Empty state does not distinguish** "no users exist" from "no search matches", and teaches nothing. Two distinct states; the first invites the admin to create a user.
5. **No success feedback anywhere.** Reset-password closes the dialog and shows nothing at all; create and edit silently refetch. Add a `Snackbar`. One shared instance in the page, not three.
6. **No pending state on dialog submit** — double-click fires two create requests. `disabled` + button spinner on all three forms.
7. **`autoComplete="new-password"`** on both password fields, or the browser offers to save the _admin's_ password as the new user's temporary one.
8. **Status toggle** refetches the entire table on every flip. Update the single row from the response (`safeUser` already returns the updated user) instead of calling `load()`.
9. **Navbar overflows at 360 px** (`AppShell.jsx:266`): brand + `/` + breadcrumb + role chip + avatar on one row with no `minWidth: 0` and no `noWrap`. Hide the breadcrumb below `sm` — the page `<h1>` already says where you are.
10. Table has `minWidth: 650` and scrolls horizontally on mobile. Acceptable, but verify the scroll container's rounded corners do not clip and that the actions column stays reachable.

### Deletes

`filterVersion` state, the apply button, `inputStyles` (already gone in Milestone 2), the `eslint-disable-next-line react-hooks/exhaustive-deps`.

### Validation

- Type in search, see the table filter without clicking anything.
- Submit create twice rapidly — one user created.
- Toggle a user's status — one PATCH, no list refetch, row updates.
- 360 px: navbar does not overflow.

---

## Milestone 7: Token migration, i18n consistency, and final polish

`/impeccable polish`

### Tasks

1. ~~**Role labels are English inside an Arabic UI.**~~ **Resolved in Milestone 6, and the team has confirmed English is the intended rendering.** The finding was never "these should be Arabic" — it was that the same concept appeared in two languages and three spellings: chips rendered `Admin` while the dropdown two clicks away said `مسؤول (Admin)`. Building every `<MenuItem>` list from `ROLE_LABELS` collapsed all of it onto one vocabulary. Verified: **8 render sites, all through `ROLE_LABELS`, zero Arabic role strings anywhere in the client.** Role names stay English (`Admin` / `Leader` / `Member` / `Supervisor`) — they are the system's role vocabulary, and the team reads them that way. **Do not translate them in a later pass.**
2. **Migrate ~120 hard-coded hex literals** to theme tokens: `color: 'text.secondary'`, `bgcolor: 'background.paper'`, `borderColor: 'divider'`. Same character count, actually themeable, and dark mode becomes possible later instead of impossible.
3. `AppShell.jsx:66,72` — `roles: ['ADMIN','LEADER','MEMBER','SUPERVISOR']` means "everyone". Omit the key.
4. Deprecated MUI v6 APIs: `PaperProps` → `slotProps.paper` (UsersPage uses the old form while AppShell already uses the new one), `InputProps` → `slotProps.input`.
5. Typo: **«تأكيد التعين»** → «تأكيد التعيين» (`UsersPage.jsx:598`).
6. **Delete the comments that restate the code**: `// Black button`, `// Light White/Zinc canvas`, `{/* Framer Motion Mobile Drawer — Absolutely Guaranteed Slide-In From Right-to-Left */}`. Self-congratulatory comments narrating the line below are the most legible AI tell in the repo, and a graduation project gets read by humans.
7. `bundle-barrel-imports` — measure first. `@mui/material` barrel imports cost real bundle size, but Vite tree-shakes reasonably. Run `npm run build -w client`, check the chunk size, and only convert to deep imports if the number justifies it. Do not do this speculatively.

### Validation

- `npm run lint`, `npm run format:check`, `npm run test`, `npm run build` all pass.
- Grep the client for `#09090b`, `#71717a`, `#e4e4e7`, `#f4f4f5` — near zero remaining.
- Grep for `'Admin'` — nothing user-facing.

---

## Recommended impeccable command order

Milestones map to commands, but the commands are the _tool_, not the plan — run them scoped to the files each milestone names.

| #   | Command                       | Scope                                        | Why here                                                                                                   |
| --- | ----------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 0   | _(none — plain backend work)_ | `server/src/validators`, `services`, `utils` | Milestone 1. Nothing downstream is verifiable until the API returns 200                                    |
| 1   | `/impeccable harden`          | `client/src/main.jsx`                        | Milestone 2. RTL cache + token layer; deletes ~60 lines and unblocks 3, 6, 7                               |
| 2   | `/impeccable harden`          | `client/src/layouts/AppShell.jsx`            | Milestone 3. Keyboard nav and drawer semantics — the two P0 accessibility defects                          |
| 3   | `/impeccable colorize`        | client-wide                                  | Milestone 4a. Accent decision + the four AA failures. Needs the token layer from step 1                    |
| 4   | `/impeccable typeset`         | client-wide                                  | Milestone 4b. Arabic letter-spacing, weight cap, heading scale. After color so the two are judged together |
| 5   | `/impeccable clarify`         | `ProfilePage.jsx`, `roles.js`, dialog copy   | Milestone 5 + 7.1/7.5. Arabic role labels, real profile fields, the typo                                   |
| 6   | `/impeccable adapt`           | `UsersPage.jsx`, `AppShell.jsx`              | Milestone 6. 360 px navbar, grid breakpoints, table scroll                                                 |
| 7   | `/impeccable polish`          | client-wide                                  | Milestone 7. Token migration, deprecated APIs, comment cleanup, final pass                                 |
| 8   | `/impeccable audit`           | all four surfaces                            | Re-score. Target ≥17/20                                                                                    |

**Do not run `critique`, `bolder`, `delight`, or `overdrive`.** This is authenticated product UI in the Restrained register — the goal is a tool that disappears into the task, not a surface with personality. Amplification commands would undo Milestone 4.

## Expected outcome

| Dimension     | Before   | Target    |
| ------------- | -------- | --------- |
| Accessibility | 1/4      | 4/4       |
| Performance   | 3/4      | 4/4       |
| Responsive    | 2/4      | 3/4       |
| Theming       | 1/4      | 4/4       |
| Anti-patterns | 1/4      | 3/4       |
| **Total**     | **8/20** | **18/20** |

Net line change is expected to be **negative** — roughly 260 lines deleted against a smaller number added.

**All seven milestones are complete as of 2026-07-24.** Re-run `/impeccable audit` against the four surfaces to score the result; that has not been done yet, so the 18/20 above is still a target, not a measurement. Two things are worth doing first: a visual check of the three authenticated pages listed at the end of Milestone 7, and a decision on the `.prettierrc` `endOfLine` issue in _Surprises_, which still blocks `npm run format:check` on any Windows checkout.

## Open questions

1. ~~**Visual identity (blocks Milestone 4).**~~ **Resolved 2026-07-24:** zinc neutrals retained, deep oxblood `#9f1e42` as the single accent. See Milestone 4.
2. **Self-service profile editing.** No user can change their own name. Plan 1 or Plan 2?
3. **Dark mode.** Out of scope here, but Milestone 2's token layer is what makes it a half-day job later instead of a rewrite. Worth confirming nobody is expecting it in the demo.
   - Note: oxblood at `#9f1e42` is too dark to sit on a dark surface. A dark theme would need a lighter tint of the same hue (~`#d4547a`) as `primary.main`. Milestone 2 should define the accent as a small ramp rather than one value so this stays cheap.

## Progress

### Milestone 1 — Repair the user-management contract ✅ 2026-07-24

| Task                                     | File                                                         | Status                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Blank filters no longer rejected         | `server/src/validators/userValidators.js`                    | done — `blankToUndefined()` preprocessor on `search`, `role`, `status`                   |
| Status vocabulary aligned to `disabled`  | `userValidators.js`, `userService.js`                        | done                                                                                     |
| `search` trimmed and capped at 100 chars | `userValidators.js`                                          | done — blank no longer produces `%%` in the `iLike`                                      |
| Admin-set passwords use the real policy  | `userValidators.js`                                          | done — imports `passwordPolicySchema` from `authValidators.js`; no second policy written |
| `lastLoginAt` + `createdAt` exposed      | `server/src/utils/safeUser.js`                               | done — `tokenVersion` deliberately still stripped                                        |
| Dead "إصدار الجلسة" row replaced         | `client/src/pages/ProfilePage.jsx`                           | done — now «آخر تسجيل دخول» via `Intl.DateTimeFormat('ar')`, no date library             |
| Actor FK guard deduplicated              | `server/src/services/userService.js`                         | done — `resolveActorId()`, 4 call sites, −24 lines                                       |
| Regression tests                         | `server/tests/userValidators.test.js` (new), `users.test.js` | done — 5 unit (no DB) + 2 integration                                                    |

**Validation run 2026-07-24:**

- `npm run lint` — clean
- `npm run test` — **37/37 pass** (5 suites). Access log confirms `GET /api/users?page=1&pageSize=20&search=&role=&status=` → **200** and `?status=disabled` → **200**; both returned 400 before this milestone
- `npm run build` — clean. Client bundle baseline recorded: **704.25 kB / 220.90 kB gzip** (single chunk). This is the number Milestone 7 task 7 measures against before deciding whether deep imports are worth it
- `npm run format:check` — **fails repo-wide, pre-existing, not caused by this milestone.** See Surprises

Net: **−30 lines**, one new test file.

### Milestone 2 — RTL foundation and token layer ✅ 2026-07-24

| Task                                                                                                                             | Status                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `stylis` + `stylis-plugin-rtl` installed, `CacheProvider` with `[prefixer, rtlPlugin]`                                           | done — `prefixer` re-added explicitly because supplying `stylisPlugins` replaces Emotion's defaults |
| `MuiInputLabel` override block deleted                                                                                           | done                                                                                                |
| `MuiInputAdornment` block (8 × `!important`) deleted                                                                             | done                                                                                                |
| `fieldset legend { display: none }` deleted                                                                                      | done — native notch restored                                                                        |
| `MuiOutlinedInput` stripped of RTL padding/`textAlign` hacks                                                                     | done — autofill suppression kept, it is legitimate                                                  |
| Token layer: `text.disabled`, `action.hover`, `action.selected`, AA `success`/`error`/`warning`, single `shape.borderRadius: 10` | done                                                                                                |
| Oxblood accent as a 3-step ramp (`light`/`main`/`dark`)                                                                          | done — `light: #d4547a` reserved for a future dark theme                                            |
| `FOCUS_RING` token + `Mui-focusVisible` on Button and IconButton                                                                 | done                                                                                                |
| `MuiCard` defaults to `variant="outlined"`                                                                                       | done — the built-in expression of "bordered, shadowless panel"; pages stop hand-writing the border  |
| `inputStyles` deleted from `UsersPage`                                                                                           | done — 11 usages + the 11-line object                                                               |

**Browser verification (dev server, `localhost:5174/login`).** Screenshots were unavailable (pane not compositing), so this was verified through computed styles, which is the more precise check for "is the CSS flipped":

- Emotion caches in the document: `["muirtl-global", "muirtl"]` only — the RTL cache is the sole cache, plugin confirmed live
- Label computed `right: 0px` (MUI ships `left: 0`) and `transform-origin: right top` (MUI ships `left top`) — **the flip is real**, and it is what the hand-written `right: 16 / left: auto / transformOrigin: top right` was imitating
- Shrunk state `matrix(0.75, 0, 0, 0.75, -14, -9)` — correct scale and RTL-negative X
- Notch: legend 83px vs label 73px, `max-width: 100%` — **the native notch covers the label**, so removing `legend { display: none }` was safe and the background-chip workaround is unnecessary
- Field radius `10px` from the single `shape.borderRadius`
- Console clean — no MUI, Emotion, or React warnings

**Gotcha worth recording:** the preview pane runs with `document.visibilityState === 'hidden'`, so CSS transitions never advance and any transition-backed property (`transform`, the legend's `max-width`) reads stuck at its start value. First measurements looked like a shrink regression and were not. Injecting `* { transition: none !important }` before measuring is the reliable method in this environment.

**Validation run 2026-07-24:** `npm run lint` clean · `npm run test` **38/38** (37 server + 1 client) · `npm run build` clean · changed files pass Prettier ignoring line endings.

Bundle: 704.25 kB → **712.68 kB** (220.90 → **223.84 kB gzip**). **+2.9 kB gzip** for the RTL plugin, against ~60 lines of hand-written workarounds removed.

Net: **−33 lines** across the two files, while `main.jsx` simultaneously gained the RTL cache, the full token set, and the accent ramp.

**Deferred to Milestone 7 (scope expansion — record before it is forgotten):** the token layer is correct, but pages still override it with hard-coded values, so the accent does not yet appear anywhere. Confirmed on the login page: the submit button computes to `rgb(24, 24, 27)` (`#18181b`, hard-coded locally) with `border-radius: 25px`, which ignores both `palette.primary` and the new single-radius Shape Consistency Lock. **The audit scoped to four surfaces, but the accent migration must cover the whole authenticated app** — `LoginPage`, `ChangePasswordPage`, `ForgotPasswordPage`, `DashboardPage`, `NotFoundPage`, `UnauthorizedPage` — or the Color Consistency Lock is violated by construction.

**Not yet verified:** `TablePagination` arrow direction and `Switch` orientation. Both live behind authentication, and entering a password is out of bounds for me. Needs a signed-in session.

### Milestone 3 — Accessibility: keyboard, semantics, modal behavior ✅ 2026-07-24

| Task                                         | Status                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Nav items became real links                  | done — `ListItemButton component={NavLink}` renders `<a href tabindex="0">`                                                                |
| `aria-current` on the active item            | done — **free**: `NavLink` sets it itself, so the `location.pathname === item.path` comparison is gone                                     |
| `<nav>` / `<ul>` / `<li>` landmark structure | done — `nav[aria-label="التنقل الرئيسي"]`, `List`/`ListItem`                                                                               |
| Visible focus ring                           | done — `FOCUS_RING` on `Mui-focusVisible` (Milestone 2 theme), plus `ListItemButton`'s own focus styles                                    |
| Hand-rolled drawer replaced                  | done — `<Drawer anchor="right" variant="temporary">`; focus trap, Escape, focus restore, scroll lock, `aria-modal` all now supplied by MUI |
| `renderSidebarContent` extracted             | done — `SidebarNav` at module level (`rerender-no-inline-components`)                                                                      |
| Per-row action labels                        | done — «تعديل بيانات {name}», «إعادة تعيين كلمة مرور {name}», and the Switch label flips between «تعطيل»/«تفعيل» to match its action       |
| Dialog `aria-labelledby`                     | done — all three, wired to their `DialogTitle` id                                                                                          |
| Touch targets ≥40px                          | done — dropped `size="small"` from the header and row icon buttons (MUI default = 40px), avatar 28→32px, nav rows `minHeight: 44`          |
| Header height mismatch                       | done — single `HEADER_HEIGHT = 56` constant drives the header, the sidebar `top`, and the main `padding-top`                               |

**Extra deletions taken while the file was open** (these were Milestone 7 items, but rewriting around hex literals I was about to delete would have been wasted work): `AppShell` now uses theme tokens throughout, `NAV_GROUPS`/`BREADCRUMBS` are module constants instead of being rebuilt every render, the `roles: [all four roles]` "everyone" keys are gone, the breadcrumb `switch` became a lookup object, and framer-motion left the shell entirely — `ListItemButton`'s ripple is the tactile feedback that `whileTap` was providing.

**Validation run 2026-07-24:** `npm run lint` clean · `npm run test` **42/42** (37 server + 5 client) · `npm run build` clean.

New test file `client/src/layouts/AppShell.test.jsx` — 4 tests, the plan's own Milestone 3 criterion:

- nav items expose link role, accessible names, and `href` (a `<div>` has none of these)
- exactly one item carries `aria-current="page"`, and it is the current route
- the admin-only group does not render for a `MEMBER`
- drawer trigger, collapse toggle, and account button all have accessible names

**Gotcha worth recording:** `vite.config.js` does not set `test.globals`, so `@testing-library/react` cannot register its own `afterEach` and **auto-cleanup never runs** — the DOM accumulates across tests in a file and every query fails with "multiple elements found". Any new client test file needs an explicit `afterEach(cleanup)`. The alternative is adding `globals: true` to the vitest config, which is a shared-config change and was left alone.

Bundle: 712.68 → **723.03 kB** (223.84 → **227.42 kB gzip**), from pulling in `Drawer`, `List`, `ListItem`, `ListItemButton`. That is the cost of deleting the hand-rolled drawer and gaining real modal semantics.

Net: **−156 lines** across `AppShell.jsx` and `UsersPage.jsx` (389 deleted, 233 added). `AppShell.jsx` went 493 → 378 lines while gaining accessibility it did not have.

**Not yet verified in a browser:** the shell only renders behind authentication, so the drawer's focus trap, Escape handling, and the RTL slide direction are covered by unit tests and MUI's own guarantees but have not been seen running. Same blocker as Milestone 2's `TablePagination`/`Switch`.

### Milestone 3b — RTL regression found on review ✅ 2026-07-24

**The sidebar rendered on the left.** Reported by the user, reproduced immediately, and it was mine — introduced in Milestone 2, carried through Milestone 3, invisible to me because the shell is behind a login I could not perform.

**Root cause: `stylis-plugin-rtl` flips _physical_ CSS properties.** The shell's positioning was written before the plugin existed, when `right: 0` meant right. After Milestone 2 it does not:

| Written                   | Computed                    | Effect                                                                      |
| ------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| `right: 0`                | `left: 0px`                 | sidebar moved to the left edge                                              |
| `borderLeft`              | `border-right`              | border on the wrong edge                                                    |
| `<Drawer anchor="right">` | slides in from the **left** | MUI maps the anchor logically and swaps it when `theme.direction === 'rtl'` |

`main` also spanned 0–696 while the sidebar sat at 0–260, so content rendered _underneath_ the nav with 260px of dead space on the right. Broken in both directions at once.

**Fix — logical properties, not physical.** The plugin has nothing to flip and the browser resolves direction natively:

- `right: 0` → `insetInlineStart: 0`
- `right: 0, left: 0` → `insetInline: 0`
- `borderLeft` → `borderInlineEnd`
- `<Drawer anchor="right">` → `anchor="left"` (reads backwards; commented at the call site)

**Verified in the browser at 956px and 375px:**

- sidebar 696–956, `onRightEdge: true`; computed `right: 0px`; border on the content-facing edge; `main` ends exactly where the sidebar begins, no overlap
- mobile drawer paper 115–375 — hugs the right edge; `focusTrapped: true`, `scrollLocked: true`, backdrop present

**Rule for the rest of this plan and for Plan 2+: never write `left`/`right`/`marginLeft`/`borderLeft` in `sx`.** Use `insetInlineStart`/`insetInlineEnd`/`marginInlineStart`/`borderInlineEnd`. Physical properties in an RTL codebase with the plugin installed are a trap that only shows up visually.

**Also verified now that a session exists — the two Milestone 2 leftovers both pass:**

- `TablePagination`: "next" at x=35, "previous" at x=75 — next sits left of previous, correct for RTL
- `Switch`: checked thumb at the inline-end edge; travel direction follows the text direction

### Milestone 4 — Visual identity: color and type ✅ 2026-07-24

| Task                                     | Status                                                                                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color Consistency Lock                   | done — accent now used by exactly two component families, `MuiAvatar` (identity) and `MuiButtonBase` (buttons + active nav link). Verified by scanning every element's computed color |
| Four contrast failures                   | done, all re-measured in the browser (table below)                                                                                                                                    |
| Status no longer color-only (WCAG 1.4.1) | done — shared `StatusChip`: «نشط» filled green, «معطل» outlined neutral. Filled-vs-outlined carries it, not hue                                                                       |
| Orphan `#f59e0b`                         | deleted                                                                                                                                                                               |
| Negative letter-spacing on Arabic        | done — 5 sites, now `normal`; theme also sets it for h4/h5/h6                                                                                                                         |
| Fake bold                                | done — 6 × `fontWeight: 800` → 700, matching the loaded font's ceiling                                                                                                                |
| Heading scale                            | done — page titles `h4` (34px) → `h5` (24px) with `component="h1"`, correct product-register density                                                                                  |
| Hex literals in the audited surfaces     | **0 remaining** in `AppShell.jsx`, `UsersPage.jsx`, `ProfilePage.jsx`                                                                                                                 |

**Contrast, measured live rather than calculated:**

| Element                     | Before | After                                      |
| --------------------------- | ------ | ------------------------------------------ |
| Active nav / primary button | —      | **7.67:1** (oxblood on white)              |
| «نشط» chip                  | 2.33:1 | **5.48:1**                                 |
| «معطل» chip                 | 3.42:1 | outlined neutral, **7.03:1**               |
| Sidebar group header        | 2.56:1 | **4.83:1**                                 |
| Role chip                   | —      | **16.69:1**, identical in navbar and table |

**Two problems the measurements caught that reading the code would not have:**

1. **`action.selected` leaked into every Chip.** I set it to the accent tint `#fdf1f4` for a future selected-row surface; MUI uses `palette.action.selected` as the _default Chip fill_, so every neutral chip turned pale pink. Reverted to MUI's neutral default — nothing needs an accent-tinted selection surface yet, and one can be added explicitly when something does.
2. **The status Switch was oxblood.** MUI defaults switches to `primary`, so an active row showed a green «نشط» chip beside an accent-colored toggle, both meaning "active". Now `color="success"`, matching its chip. This is what kept the Color Consistency Lock honest.

Also fixed: the role chip was `variant="outlined"` in the navbar and filled in the table — same concept, two vocabularies. Both are filled neutral now.

**Validation run 2026-07-24:** `npm run lint` clean · `npm run test` **42/42** · `npm run build` clean · all client `.jsx` pass Prettier ignoring line endings.

Bundle: 723.03 → **721.27 kB** (227.42 → **227.39 kB gzip**) — slightly _smaller_, since deleted `sx` objects outweigh the new `StatusChip`.

**Deferred, unchanged:** role labels still render "Admin" in English inside the Arabic UI — that is Milestone 7 task 1, along with the remaining hex in `LoginPage`, `DashboardPage`, `ChangePasswordPage`, `ForgotPasswordPage`, `UnauthorizedPage`.

### Milestone 5 — Profile page ✅ 2026-07-24

| Task                                     | Status                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| «تاريخ الإنشاء» added from `createdAt`   | done — the field exposed in Milestone 1 now has a consumer                           |
| Fixed `width: 120` label column replaced | done — `<dl>` on a CSS grid, `minmax(120px, auto) 1fr` at `sm`+, single column below |
| Long values no longer overflow           | done — `overflowWrap: 'anywhere'`                                                    |
| Arabic role label                        | deferred to Milestone 7 (single source of truth)                                     |
| Self-service name editing                | **out of scope**, see Surprises                                                      |

**Two changes beyond the literal task list, both justified:**

1. **The rows became a real `<dl>`.** Label/value pairs are what a description list is for; the previous markup was generic `Typography` inside `Stack`, which told assistive tech nothing about the pairing. The grid also removes the fixed-width alignment problem at its root rather than patching it.
2. **The `EmailOutlined` and `SecurityOutlined` icons were dropped.** They decorated three label/value rows without disambiguating anything, and they were what forced the fixed-width label column. Two fewer imports, less markup, better alignment.

**RTL detail worth keeping:** the email `<dd>` carries `dir="ltr"`. Latin text inside an RTL paragraph gets reordered by the bidi algorithm — a trailing dot or a hyphenated domain can render in the wrong place. This is the kind of thing that only shows up with real data.

**Verified in the browser at both breakpoints:**

- **956px** — grid resolves to `120px 446px`, all three rows correct, no page overflow
- **375px** — grid collapses to a single `293px` column
- **Overflow stress test**, the actual failure the old layout had: a 67-character email (`mohammed.abdulrahman.alwahidi.student@engineering.university.edu.jo`) wraps to 2 lines with `ddOverflows: false` and `pageOverflowsWithLongEmail: false`; the card stays inside the viewport. The old `width: 120` with no wrap had neither guard.
- Fresh tab, clean console buffer: **zero errors**

**Validation run 2026-07-24:** `npm run lint` clean · `npm run test` **42/42** · `npm run build` clean · Prettier clean.

Bundle: 721.27 → **721.00 kB** (227.38 kB gzip).

### Milestone 5b — Self-service profile editing ✅ 2026-07-24

Requested explicitly after Milestone 5, which promotes the _Surprises_ entry below from "team decision" to shipped scope.

**Alignment fix first (user-reported).** The email value sat left while «آخر تسجيل دخول» and «تاريخ الإنشاء» sat right. Same root cause as the sidebar: `textAlign: 'right'` is a **physical** value, and `stylis-plugin-rtl` rewrote it to `left`. Fixed with the logical `textAlign: 'end'`, which on a `dir="ltr"` element resolves to the right edge and the plugin leaves alone. Verified: all three values right-align at x=503, **spread 0px**.

**Backend**

| Piece                                        | Detail                                                                                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration `0004-create-email-change-otps.js` | New table, not a `purpose` column on `password_reset_otps` — the reset flow is shipped and working, and a discriminator would mean touching every existing query for no gain. Carries `new_email`, which reset does not need      |
| `EmailChangeOtp` model + associations        | registered in `models/index.js`                                                                                                                                                                                                   |
| `PATCH /api/auth/me`                         | name only. Email goes through OTP; role and `isActive` stay admin-controlled because they are authorization, not profile                                                                                                          |
| `POST /api/auth/change-email/request`        | requires the **current password** — email is the login identity, so a hijacked session alone must not be enough. Sends the code to the **new** address, which is what proves mailbox control. Nothing is written to `users.email` |
| `POST /api/auth/change-email/confirm`        | 6-digit code, 10-minute expiry, 5-attempt cap, re-checks the address is still free (it can be claimed between the two calls), then bumps `token_version` and clears the cookie                                                    |

Both OTP routes sit behind the existing `otpLimiter`, and the OTP hashing, expiry, and attempt-cap logic mirror the password-reset flow rather than inventing a second pattern.

**Frontend** — `EditNameDialog`, `ChangeEmailDialog` (two-step), an edit affordance beside the name, a «تغيير» action on the email row, and a success Snackbar. Confirming the email change signs the user out and redirects to `/login`, which the dialog states up front rather than springing on them.

**8 new server tests** (`server/tests/profile.test.js`), all passing:

- unauthenticated `PATCH /auth/me` → 401
- name updates
- **privilege escalation blocked** — posting `role: 'ADMIN', isActive: false` to the profile endpoint changes neither
- wrong current password → 400
- address already taken → 409
- **email is not changed until the OTP is confirmed**
- wrong OTP → 400
- correct OTP applies the change **and the cookie that performed it is dead afterwards** (401 on `/auth/me`)

**Browser-verified:** both dialogs expose `aria-labelledby`, trap focus, and carry correct `autocomplete` hints (`email`, `current-password`); Save is disabled until the name actually changes. The full email round-trip could not be driven from the browser because it requires entering a password — the server tests cover it end to end.

### Milestone 6 — Users page: states and interaction ✅ 2026-07-24

| Task                                     | Status                                                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Debounced search, «تطبيق» button deleted | done — 300ms; **5 keystrokes produced 1 request**, measured by counting XHRs                                                     |
| `filterVersion` counter deleted          | done — `load` is a `useCallback` keyed on the real inputs, and the `eslint-disable` for exhaustive-deps went with it             |
| Page resets to 1 on filter change        | done — the old code never did, stranding you on a page the narrower result set no longer had                                     |
| `Grid item sm={1}` button                | moot — the button no longer exists; grid is now `6 / 3 / 3`                                                                      |
| Skeleton loading                         | done — **25 skeleton cells during load, 0 after**; shaped like the real rows so the layout does not jump                         |
| Two distinct empty states                | done — «لا نتائج مطابقة» with a clear-filters action vs «لا يوجد مستخدمون بعد» with a create action                              |
| Success feedback                         | done — one shared Snackbar for create, edit, reset, and status. Reset-password previously closed the dialog and showed _nothing_ |
| Submit-pending state                     | done — `loading` on all three submit buttons, cancel disabled mid-flight; double-click can no longer create two users            |
| `autoComplete="new-password"`            | done — both temp-password fields, so the browser stops offering to save the **admin's** password                                 |
| Status toggle                            | done — patches the single row from the response instead of refetching the whole table                                            |
| Role option lists                        | done — built from `ROLE_LABELS`; the four hand-typed `<MenuItem>` blocks are gone                                                |
| Navbar at 360px                          | done — **zero page overflow**; header collapses to `SponsorSync                                                                  | A`  |
| Table on mobile                          | done — scrolls inside its own container, container stays within the viewport                                                     |

Typo fixed in passing: «تأكيد التعين» → «تأكيد التعيين».

**Validation run 2026-07-24:** `npm run lint` clean · `npm run test` **50/50** (45 server + 5 client) · `npm run build` clean · Prettier clean · fresh-tab console clean.

Bundle: 721.00 → **737.05 kB** (227.38 → **231.83 kB gzip**), for the OTP dialogs, Skeleton, and Snackbar.

### Milestone 7 — Token migration and final polish ✅ 2026-07-24

| Task                                | Status                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Role labels                         | resolved in Milestone 6; English confirmed as intended (see Decision Log)                                               |
| Hex literals → tokens               | done — **the only hex left in the entire client is the 19 token definitions in `main.jsx`**, which is where they belong |
| Accent reaches the whole app        | done — `LoginPage`, `ChangePasswordPage`, `ForgotPasswordPage`, `DashboardPage`, `UnauthorizedPage`, `NotFoundPage`     |
| `roles: [all four]` "everyone" keys | done in Milestone 3                                                                                                     |
| `PaperProps` → `slotProps.paper`    | done in Milestone 3                                                                                                     |
| `InputProps` → `slotProps.input`    | done — 6 sites                                                                                                          |
| «تأكيد التعين» typo                 | done in Milestone 6                                                                                                     |
| Comments that restate the code      | done — 8 section-label comments removed                                                                                 |
| `bundle-barrel-imports`             | **measured, then skipped** — see below                                                                                  |

**A regression of mine, caught here.** Numeric `borderRadius` in `sx` is a **multiplier** of `theme.shape.borderRadius`, not a pixel value. Setting `shape.borderRadius: 10` in Milestone 2 silently inflated every numeric radius on the unaudited pages by 2.5× — the login submit button was 10px before and rendered **25px** after. I missed it because Milestone 2 only checked the four audited surfaces. All 21 radius overrides are now deleted so everything inherits the single value; verified on the login page: **one radius in use, `10px`, across all four rounded elements.**

**Deletions this milestone**

- The identical 10-line error-`Alert` `sx` block, copy-pasted across three auth pages, plus its `@keyframes alertSlideIn` **defined three separate times**. Now one `MuiAlert` theme entry.
- **Glassmorphism on the auth cards** — `rgba(255,255,255,0.96)` + `backdrop-filter: blur(20px)` + a custom drop shadow + a 28px radius, on `LoginPage`, `ChangePasswordPage`, and `ForgotPasswordPage`. The blur sat over a flat background, so it rendered nothing while still costing a compositing layer. One of the audit's named absolute bans. These are now the same bordered, shadowless panel as every other surface.
- 6 tinted drop shadows (`rgba(24,24,27,0.16)` under buttons and medallions) — the app's language is flat and bordered.
- 27 inline `fontFamily: '"IBM Plex Sans Arabic"...'` declarations that the theme already sets globally.
- The login page's decorative `radial-gradient` background.

**Reduced motion — a gap the audit did not catch.** The app had **no `prefers-reduced-motion` handling anywhere**, while running CSS keyframe animations on three auth pages and framer-motion on four more. Two fixes, because they need different mechanisms: a global CSS guard in `MuiCssBaseline`, and `<MotionConfig reducedMotion="user">` in `main.jsx`, since framer-motion animates in JS and a CSS media query cannot reach it. Verified the guard is present in the emitted stylesheet.

**Bundle: measured, then left alone.** 734.76 kB / **229.89 kB gzip**, single chunk. Deep MUI imports were the plan's candidate fix, but Vite already tree-shakes the ESM build, so the realistic win is small. The actual lever is route-level `React.lazy` splitting — a structural change well outside a polish plan. **Recorded, not done**; the baseline is here for whoever picks it up.

**Validation run 2026-07-24:** `npm run lint` clean · `npm run test` **50/50** · `npm run build` clean · Prettier clean.

**Verified in the browser (login page, signed out):** card radius 10px, `box-shadow: none`, `backdrop-filter: none`, solid white on a 1px divider border; brand mark and submit button both `rgb(159, 30, 66)`; no horizontal overflow; reduced-motion guard present in the CSSOM.

**Not re-verified visually:** `DashboardPage`, `ChangePasswordPage`, and `UnauthorizedPage` all sit behind authentication, and signing back in needs a password I cannot enter. Their changes were mechanical (token substitution and radius removal, both verified by grep and a clean build) but no human has looked at them since. **Worth a two-minute eyeball before the demo.**

### Milestone 8 — Closing the loose ends ✅ 2026-07-25

Everything Milestone 7 left open, resolved.

**1. `format:check` now passes on Windows.** Added `"endOfLine": "auto"` to `.prettierrc.json`. `core.autocrlf=true` checks files out as CRLF while Prettier defaults to `lf`, so **69 files failed repo-wide** — including files nobody had touched. It was flagged as a shared-tooling decision; the team asked for it, and it is one line. `npm run format:check` is green for the first time on a Windows checkout, which unblocks required command 8 in `AGENTS.md`.

**2. The three unverified pages are now covered.**

- `UnauthorizedPage` is a **public route**, so it was verified in the browser directly: single `10px` radius across both rounded elements, oxblood button with white text, `box-shadow: none`, no overflow.
- `DashboardPage` and `ChangePasswordPage` sit behind authentication, so they got a standing render test instead of a one-time glance — `client/src/pages/pages.test.jsx`, 5 tests. Better than an eyeball: it re-runs in CI forever.

The new test file also carries a **regression guard for the Milestone 7 radius bug**: it greps every page source for a hard-coded `borderRadius` and fails if one appears. Numeric `sx` radii are multipliers of `theme.shape.borderRadius`, so any future override silently rescales when the theme value changes. That class of bug cannot come back silently now.

Also fixed in passing: `DashboardPage`'s title was still `variant="h4"` with no `component="h1"` — the last page not on the heading scale set in Milestone 4.

**3. Route-level code splitting — the real bundle lever, now pulled.** Milestone 7 measured the bundle and deferred this as "structural". It is ~20 lines: `lazy()` per route plus one `<Suspense>` boundary. `LoginPage` stays eager, since it is the entry point for every unauthenticated visit and lazy-loading it would only add a round trip to the most common first paint.

|                                        | Before    | After                 |
| -------------------------------------- | --------- | --------------------- |
| Initial chunk                          | 734.76 kB | **535.25 kB**         |
| Initial gzip                           | 229.89 kB | **171.54 kB**         |
| **Measured over the wire on `/login`** | —         | **167.5 kB, 1 chunk** |

**−27% on first paint**, verified against a production `vite preview` build with the browser's own resource timings rather than the build log — `UsersPage` (32.5 kB), the OTP flow, and the shared `proxy` chunk (123 kB) no longer load on the way to the login form.

**Validation run 2026-07-25:** `npm run lint` clean · `npm run format:check` **clean (first time on Windows)** · `npm run test` **55/55** (45 server + 10 client) · `npm run build` clean.

### Milestone 9 — "first login always fails" ✅ 2026-07-25

Reported symptom: the first login attempt says to re-check the email and password; clicking again with the same credentials works.

**The credentials were never wrong.** Two observations identified it without reproducing a real login:

1. The server's rejection reads **"The email or password is incorrect."** — in English. The user was seeing **Arabic** text.
2. That Arabic string is `LoginPage`'s local fallback, which only renders when `err.response` is `undefined` — meaning **no HTTP response came back at all**.

Reproduced by touching a server file to trigger a `node --watch` restart and firing a login immediately: `ECONNREFUSED after 12 ms`. `npm run dev` starts Vite (ready ~220ms) and the API through `concurrently` → `npm --workspace` → node (~320ms boot plus npm spawn overhead), so **the page is interactive and accepting a login before the API is listening**. Any `node --watch` restart reopens the same window.

**The defect was the message, and it was in 13 places.** Every call site collapsed "server unreachable" into its own domain fallback — "wrong credentials", "failed to load users", and so on — so a transport failure always accused the user of something. New `client/src/api/errorMessage.js` distinguishes the cases; all 13 sites route through it, with 5 unit tests.

Verified by driving the real login form:

| Condition                   | Message                                                           |
| --------------------------- | ----------------------------------------------------------------- |
| API unreachable             | «تعذّر الاتصال بالخادم. تأكد من أن الخادم يعمل، ثم أعد المحاولة.» |
| Genuinely wrong credentials | «البريد الإلكتروني أو كلمة المرور غير صحيحة.»                     |

**Server messages are now Arabic.** 24 user-facing strings across middleware, services, validators, and both handlers. No test asserted on the English text (they assert on `error.code`), so nothing broke. Health-check strings stay English — that endpoint is for operators, not users. A regression test asserts the login-401 and unauthenticated-401 messages contain Arabic characters.

**A 500 found while translating.** Services call `passwordPolicySchema.parse()` directly, and a raw `ZodError` carries no numeric `status`, so `errorHandler` treated it as a **500 «حدث خطأ غير متوقع»**. A new password that was long enough for the route schema but failed the character-category rule hit exactly this. `errorHandler` now maps `ZodError` → **400** with the policy message. The pre-existing test used `'short'`, which the route's `min(10)` caught first, so the path was never exercised; there is now a test that reaches it.

**Cold DB connection removed.** `pool: { min: 0 }` meant every request after 10s idle reopened a TLS connection to Supabase.

|                                    | Before (`min: 0`) | After (`min: 1`) |
| ---------------------------------- | ----------------- | ---------------- |
| First DB round-trip after 15s idle | **1738 ms**       | **92 ms**        |
| Warm                               | 159 ms            | 77 ms            |

One connection is now held per server process. With `max: 5` and a four-person team this is comfortably inside Supabase's budget; revisit if the app is ever scaled horizontally.

**Validation run 2026-07-25:** `npm run lint` clean · `npm run format:check` clean · `npm run test` **62/62** (47 server + 15 client) · `npm run build` clean.

**Console-noise gotcha:** React error-boundary messages accumulate in the preview console buffer from intermediate HMR states — e.g. the window between adding `<StatusChip />` and adding its import. They persist across in-app navigation and look like live failures. Opening a fresh tab gives a clean buffer and is the only reliable way to tell a real error from HMR residue.

## Surprises and Discoveries

- `GET /api/users` has never returned 200 from the React client. The client sends `role=&status=`; the Zod schema rejects empty strings on optional enums. Verified by executing `listUsersQuerySchema.safeParse()` against the exact params the client sends. The failure surfaced as an Arabic error alert, which read as intentional UI.
- Client and server disagree on the disabled-status vocabulary: `disabled` vs `inactive`.
- `safeUser` intentionally strips `tokenVersion`, so `ProfilePage`'s "إصدار الجلسة" row has always rendered `v0` regardless of the real value.
- `lastLoginAt` is written on every login (`authService.js:37`) and has never been exposed by any endpoint.
- The three commits fighting the mobile drawer's slide direction were treating a symptom of the missing Emotion RTL cache.
- ~~**`npm run format:check` fails on 69 files repo-wide**~~ **Resolved 2026-07-25 (Milestone 8)** — `"endOfLine": "auto"` in `.prettierrc.json`. Original diagnosis kept below.
- **(historical) `npm run format:check` fails on 69 files repo-wide, and always has on Windows.** Cause: `core.autocrlf=true` checks files out with CRLF, while Prettier defaults to `endOfLine: "lf"` and `.prettierrc` does not override it. Files nobody has touched (e.g. `skills-lock.json`) fail too, so this is not from any recent change. It almost certainly passes in Linux CI, which is why it went unnoticed. **Not fixed here** — the one-line fix is `"endOfLine": "auto"` in `.prettierrc`, but that is shared tooling config affecting all four members, so it needs a team decision rather than a drive-by edit. Verified separately that every file this milestone touched passes Prettier when line endings are ignored (`prettier --check --end-of-line auto`). Required command 8 in `AGENTS.md`/`CLAUDE.md` cannot pass on a Windows checkout until this is settled.
- ~~**No user can change their own name, anywhere in the application.**~~ **Resolved 2026-07-24 (Milestone 5b)** — the team asked for it, so name editing and OTP-verified email change shipped. Original note kept below for the reasoning.
- **(historical) No user can change their own name, anywhere in the application.** The profile page is read-only and there is no self-service edit path; only an ADMIN can rename someone, via `PATCH /api/users/:id`. Fixing it needs a new `PATCH /api/auth/me` endpoint (name only — email and role must stay admin-controlled, since email is the login identity and role is authorization). Deliberately **not** implemented here: it is a new endpoint plus a new form, which is a feature, not polish. The team should decide whether it belongs to Plan 1's scope or Plan 2's.
- **A dev server from the main checkout owns port 4000 on this machine, so the worktree's client was talking to the wrong backend.** Caught when the profile page rendered «لا يوجد» for a last-login value that had just been verified present in the database. Two contributing causes: (1) the harness injects its configured preview port into the launched process as `PORT`, and `env.port` is `Number(process.env.PORT) || 4000`, so the worktree API tried to bind 5174 — the port Vite already held; (2) an unrelated `node src/server.js` (PID 26872, not started by this session) was still listening on 4000, and the client happily used it. It answered `status=disabled` with a 400, which is how the mismatch was confirmed. **Resolved without touching the other process:** the worktree API now runs on 4001, `client/.env` points at it (cookies are port-agnostic, so sessions survive), and `.claude/launch.json` starts only the client so the injected `PORT` cannot reach the server. Anyone running two checkouts at once needs this, and `server/src/server.js` logging `env.port` is what made it diagnosable.
- **`server/.env` does not exist in a fresh git worktree** (correctly gitignored), so the four DB-backed suites fail at import with `No Sequelize instance passed` before running a single test. Anyone working in a worktree must copy `server/.env` from the main checkout first. Worth a line in `docs/local-setup.md`.

## Decision Log

| Date       | Decision                                                                                          | Rationale                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-24 | `stylis-plugin-rtl` is the only new dependency                                                    | Officially documented MUI RTL setup; replaces ~50 lines of hand-written `!important` workarounds                                                                                                                                                                                                         |
| 2026-07-24 | `design-taste-frontend` applied as 4 rules, not wholesale                                         | Its own scope line excludes dashboards, data tables, and product UI                                                                                                                                                                                                                                      |
| 2026-07-24 | Motion skills excluded                                                                            | Product register calls for 150–250 ms state transitions only; no orchestrated sequences                                                                                                                                                                                                                  |
| 2026-07-24 | Status vocabulary standardises on `disabled`                                                      | Client-side term; changing the client would touch more surfaces than changing the validator                                                                                                                                                                                                              |
| 2026-07-24 | Zinc neutrals retained; deep oxblood `#9f1e42` added as the single accent                         | Zinc is a sound ramp — replacing it is a large diff for no gain. The tell was shipping shadcn's _default state_ with no accent. Teal/violet excluded as LLM defaults; green/red/amber excluded because status semantics already own them                                                                 |
| 2026-07-24 | Role names render in English (`Admin`/`Leader`/`Member`/`Supervisor`) everywhere, including chips | Team decision. The audit's complaint was inconsistency (chips English, dropdowns Arabic-plus-English), not the language itself. One vocabulary from `ROLE_LABELS` satisfies it; English is the team's working vocabulary for roles. Interface copy stays Arabic — this exception is scoped to role names |
| 2026-07-24 | «معطل» becomes a neutral outlined chip, not red                                                   | A disabled account is a state, not an error. Removes the accent-vs-error-red confusability and satisfies WCAG 1.4.1 without relying on hue                                                                                                                                                               |

## Outcomes and Retrospective

_Pending._
