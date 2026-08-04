# SponsorSync UI Conventions

The client is **Arabic and right-to-left**. `client/index.html` sets `<html lang="ar" dir="rtl">`
and every user-facing string is Arabic. These are the rules that are not obvious from reading a
component, and each one has already caused a real bug in this repo.

## 1. Logical CSS properties only

`client/src/main.jsx` installs `stylis-plugin-rtl` in the Emotion cache. It **rewrites physical
properties at build time**, so what you write is not what renders:

| You write               | It renders as      | Result                       |
| ----------------------- | ------------------ | ---------------------------- |
| `left: 0`               | `right: 0`         | element on the opposite edge |
| `ml: 1` (`margin-left`) | `margin-right`     | gap on the wrong side        |
| `textAlign: 'right'`    | `text-align: left` | text on the wrong side       |
| `borderLeft`            | `border-right`     | border on the wrong side     |

Use logical properties, which the plugin leaves alone:

    insetInlineStart / insetInlineEnd     not  left / right
    marginInlineStart / marginInlineEnd   not  ml / mr / marginLeft
    paddingInlineStart / paddingInlineEnd not  pl / pr
    borderInlineStart / borderInlineEnd   not  borderLeft / borderRight
    textAlign: 'start' | 'end'            not  'left' | 'right'

Two shipped bugs came from this: the sidebar rendered on the left of an Arabic app, and the
profile email was misaligned against the rows above it. A third nearly followed from a comment
that explained the drawer's position wrongly.

**MUI's `<Drawer anchor="left">` is a trap.** MUI does _not_ flip the anchor for RTL — it emits a
physical `left: 0` and the plugin rewrites it. The drawer is on the right by CSS accident.
Changing it to `"right"` puts it on the left. Leave it.

`align="left"` on a `TableCell` is the same trap: its `text-align` flips, but buttons positioned
inside by flexbox do not, so a header and its own controls end up on opposite sides.

## 2. Numeric `borderRadius` in `sx` is a multiplier

`theme.shape.borderRadius` is `10`, and MUI multiplies numeric `sx` radii by it. `borderRadius: 2`
means **20px**, not 2px. Prefer inheriting the theme default and setting nothing. A regression
test in `client/src/pages/pages.test.jsx` guards against hard-coded radii in `src/pages`.

## 3. Arabic copy, English role names

Every label, message, button, empty state, and error is Arabic — including anything the server
returns, since `error.message` is rendered verbatim.

**Role names stay English** (`ADMIN`, `LEADER`, `MEMBER`, `SUPERVISOR`) in pills, chips, tables,
and menus. This is a deliberate decision, not an oversight: they are the same tokens used in the
API and the database, and translating them in the UI only breaks the link. `ROLE_LABELS` in
`client/src/constants/roles.js` is the single source; use it rather than printing `user.role`.

## 4. Numbers and dates

Latin digits everywhere. `Intl.DateTimeFormat('ar', ...)` resolves to Arabic-Indic numerals
(`٢٤ يوليو ٢٠٢٦`), which clashes with every other number on the page. Use the shared
`formatDateTime` from `client/src/utils/formatDateTime.js`, which pins `ar-u-nu-latn` — Arabic
month names, Latin digits.

Latin-script content inside RTL text (emails, OTP codes, URLs) needs `dir="ltr"` on the element,
or bidi reordering will scramble it. See `ProfilePage`'s email row and the OTP inputs.

## 5. Errors

Every `catch` block goes through `getErrorMessage(err, fallback)` from `client/src/api/errorMessage.js`.
It distinguishes a transport failure ("the server is unreachable") from a domain error ("wrong
password"), which 13 call sites previously conflated — a login attempt during server startup told
the user their credentials were wrong.

Show errors in an `<Alert role="alert">` so screen readers announce them.

## 6. Accessibility floor

- Interactive targets are at least 44px in the smallest dimension.
- Every input has a real label; icon-only buttons carry `aria-label`.
- Status is never conveyed by colour alone — `StatusChip` distinguishes active from disabled by
  fill _and_ shape, not just hue.
- Body text meets 4.5:1 contrast; large text 3:1.
- Every animation respects `prefers-reduced-motion`; the theme handles this globally, and
  `<MotionConfig reducedMotion="user">` covers framer-motion.

## 7. MUI version

MUI v6.

**Grid is a trap in this version.** The default export from `@mui/material` is still the
**legacy** Grid, which takes `item` + `xs`/`sm`/`md`. The new API that takes `size={{ xs: 12 }}`
is a _separate component_, `Grid2`. Passing `size` to the legacy Grid is **silently ignored** —
no error, no console warning, a clean lint and build — and every column loses its width, which
collapses the whole layout. That has already shipped once here.

So: prefer the new API, but import it explicitly.

    import Grid from '@mui/material/Grid2';   // then <Grid container> / <Grid size={{ xs: 12 }}>

Mixing the two in one file will not work: a `Grid2` child inside a legacy `Grid container` is
not laid out. Pick one per container. `client/src/pages/pages.test.jsx` has a regression test
asserting the dashboard's grid items resolve a real `flex-basis`.

Field internals go through `slotProps={{ htmlInput: {...} }}`, not the deprecated `inputProps`.
