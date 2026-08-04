> **Status: COMPLETE — archived.** This plan shipped and is kept for history only.
> It is not a brief for new work. Do not implement from it.
> **Its design direction is superseded.** This document specifies a dark Zinc palette
> (`#09090b` canvas). The shipped theme is LIGHT — see `client/src/main.jsx` and
> `docs/ui-conventions.md`. Building from this file would rebuild the shell dark.

# Plan: Vercel + AdminLTE Shell, Framer Motion Engineering, & Dashboard Polish

**Plan Location:** `plans/02-vercel-adminlte-shell-and-dashboard.md`  
**Date:** July 24, 2026  
**Status:** Approved & Ready for Execution

---

## Purpose and Big Picture

Upgrade the SponsorSync internal application shell and dashboard pages to a high-contrast **Vercel TopBar + AdminLTE Collapsible Sidebar** layout powered by **Framer Motion (`framer-motion`)** and **Emil Kowalski's motion engineering principles**.

The shell will be 100% responsive across PCs, laptops, tablets, and mobile devices, utilizing a dark Zinc color palette (`#09090b` canvas, `#18181b` surface, `#27272a` borders), IBM Plex Sans Arabic typography, and hardware-accelerated animations.

---

## Applied Skills & Design Systems

- **`impeccable`**: Anti-slop UI, visual hierarchy, high contrast ratio (> 4.5:1), 48px minimum touch targets on mobile.
- **`frontend-design` & `design-taste-frontend`**: Glassmorphism, translucent backdrops, IBM Plex Sans Arabic typography scale.
- **`emil-design-eng`**: Tactile button press feedback (`scale(0.97)` on `:active`), origin-aware popover entrances (`scale(0.96)` + `opacity: 0`), spring physics (`stiffness: 300, damping: 30`), zero `scale(0)` animations.
- **`motion-framer`**: Framer Motion layout animations (`layoutId="activeNavPill"`), `AnimatePresence` for mobile drawer slide.
- **`vercel-react-best-practices`**: Optimized re-renders, direct imports, GPU-accelerated transforms.
- **`ponytail`**: Zero code bloat; clean, modular, maintainable React components.

---

## Proposed Changes

### Milestone 1: Install Framer Motion & Icon Assets

#### [MODIFY] [package.json](file:///d:/graduation/client/package.json)

- Add `framer-motion` package to client dependencies.

---

### Milestone 2: Rebuild Vercel TopBar & AdminLTE Collapsible Sidebar Shell

#### [MODIFY] [AppShell.jsx](file:///d:/graduation/client/src/layouts/AppShell.jsx)

- Implement **48px Vercel TopBar**:
  - Hamburger mobile trigger with tactile scale feedback.
  - Brand Logo `SponsorSync` with glowing dot.
  - Dynamic breadcrumbs (`SponsorSync / لوحة التحكم` or `SponsorSync / إدارة المستخدمين`).
  - PostgreSQL health status dot (🟢 `متصل بالخادم`).
  - User Role badge (`ADMIN` / `LEADER` / `MEMBER` / `SUPERVISOR`).
  - Profile menu dropdown.
- Implement **AdminLTE Sidebar**:
  - Desktop 240px wide sidebar with a 64px collapsed rail toggle.
  - Framer Motion `layoutId="activeNavPill"` for smooth sliding active indicator.
  - Navigation item groups: `النظام الأساسي` (CORE), `الإدارة والتراخيص` (ADMIN), `خارطة الطريق` (ROADMAP).
  - Off-canvas sliding drawer for Tablet (`< 1024px`) and Mobile (`< 768px`) with backdrop blur overlay.

---

### Milestone 3: Overhaul Dashboard Overview Page

#### [MODIFY] [DashboardPage.jsx](file:///d:/graduation/client/src/pages/DashboardPage.jsx)

- High-contrast 4-card grid:
  1. **User Security & Role Context Card**: Full name, role badge, `tokenVersion: 0`, `HttpOnly SameSite=Lax` status.
  2. **Database Infrastructure & Health Card**: PostgreSQL connection pool status, query latency indicator (`< 15ms`).
  3. **Account Directory Summary Card (Admin Only)**: Active vs disabled user accounts breakdown.
  4. **Plan 1 → Plan 4 Roadmap Stepper Card**: Interactive status tracker (Plan 1 Active/Complete, Plan 2 Events, Plan 3 Sponsorships, Plan 4 Analytics).

---

### Milestone 4: Polish Profile Page & User Management Table

#### [MODIFY] [ProfilePage.jsx](file:///d:/graduation/client/src/pages/ProfilePage.jsx)

- Polish Profile view with Zinc dark card aesthetic, role badge, and quick password change button.

#### [MODIFY] [UsersPage.jsx](file:///d:/graduation/client/src/features/users/UsersPage.jsx)

- Polish User Management data table, role chips, status toggle switches, search bar, and dialog modals to match the Vercel/Zinc design system.

---

## Verification Plan

### Automated Validation Commands

- `npm run lint` — Verify 0 lint errors/warnings.
- `npm run format:check` — Verify 100% Prettier formatting clean.
- `npm run test` — Verify all 31 tests pass.
- `npm run build` — Verify production Vite build compiles cleanly.

### Visual & Responsive Inspection

- Use `browser` subagent to capture high-res screenshots on Desktop (`1920x1080`), Tablet (`768x1024`), and Mobile (`375x667`).
