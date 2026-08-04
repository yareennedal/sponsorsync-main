# SponsorSync — Vercel + AdminLTE Command Shell & Motion Design Specification

**Spec Location:** `docs/superpowers/specs/2026-07-24-vercel-adminlte-shell-design.md`  
**Date:** July 24, 2026  
**Status:** Approved

---

## 1. Overview & Purpose

This design document specifies the production UI/UX overhaul of the **SponsorSync Foundational Application Shell & Dashboard**. The goal is to deliver an ultra-clean, high-performance **Vercel-style TopBar** combined with an **AdminLTE-style collapsible left sidebar**, enhanced with hardware-accelerated **Framer Motion (`framer-motion`)** and **Emil Kowalski's motion engineering principles**.

### Core Values & Principles

- **Ponytail Simplicity:** Zero unnecessary dependencies or bloat; clean, modular React components.
- **Impeccable Visual Taste:** High-contrast Zinc dark theme (`#09090b` canvas, `#18181b` surface, `#27272a` borders), IBM Plex Sans Arabic typography, high contrast ratio (> 4.5:1).
- **Emil Motion Engineering:**
  - Fast, responsive transitions (< 250ms with custom `cubic-bezier(0.23, 1, 0.32, 1)` ease-out).
  - Tactile button press feedback (`scale(0.97)` on `:active`).
  - Never animate from `scale(0)` (start from `scale(0.96)` + `opacity: 0`).
  - Hardware-accelerated GPU transforms (`transform: translate3d(...)` / CSS transitions off main thread).
  - Reduced-motion accessibility (`prefers-reduced-motion`).
- **100% Responsiveness:** Desktop (`≥ 1024px`), Tablet (`768px - 1023px`), and Mobile (`< 768px`) with 48px minimum touch targets.

---

## 2. Layout Architecture & Component Breakdown

### A. Vercel Command Top Bar (`VercelTopBar.jsx` / `AppShell.jsx`)

- **Height:** 48px fixed height header.
- **Left Section:**
  - Mobile/Tablet Hamburger Drawer Trigger (Icon button with tactile scale feedback).
  - Brand Identity Logo: `SponsorSync` with a subtle glowing dot.
  - Breadcrumb Tracker: `SponsorSync / لوحة التحكم` or `SponsorSync / إدارة المستخدمين`.
- **Right Section:**
  - Real-Time Infrastructure Status Dot (🟢 `PostgreSQL Connected` / 🟡 `Reconnecting`).
  - User Role Badge (`ADMIN`, `LEADER`, `MEMBER`, `SUPERVISOR`).
  - User Profile Dropdown Menu (`Profile`, `Password Settings`, `Logout`).

### B. AdminLTE / Vercel Left Sidebar (`AdminLteSidebar.jsx`)

- **Desktop Mode (`≥ 1024px`):** Fixed 240px width sidebar with a collapse/expand rail toggle button (collapses to 64px icon-only rail).
- **Mobile/Tablet Mode (`< 1024px`):** Sliding off-canvas drawer controlled by Framer Motion `AnimatePresence` + spring physics (`stiffness: 300, damping: 30`).
- **Navigation Item Groups:**
  - **النظام الأساسي (CORE):**
    - `لوحة التحكم` (Dashboard — `/app`)
    - `الملف الشخصي` (Profile — `/app/profile`)
  - **الإدارة والتراخيص (ADMINISTRATION — Admin Only):**
    - `إدارة المستخدمين` (Users — `/app/users`)
  - **خارطة الطريق (ROADMAP):**
    - `الفعاليات والفرق` (Events — Plan 2 preview)
    - `الرعايات والشركات` (Sponsorships — Plan 3 preview)
    - `التقارير والتحليلات` (Analytics — Plan 4 preview)
- **Active Indicator:** Sliding active indicator pill using Framer Motion `layoutId="activePill"`.

### C. Dashboard Cards & Overview (`DashboardPage.jsx`)

- **Card 1: User Security & Role Context**
  - Profile avatar, full name, role badge (`ADMIN`), security token version (`v: 0`), cookie mode (`HttpOnly SameSite=Lax`).
- **Card 2: Database Infrastructure & Latency**
  - PostgreSQL connection health, query latency indicator (`< 15ms`), connection pool metrics.
- **Card 3: Account Directory Statistics (Admin Only)**
  - Active users count, disabled accounts count, role distribution summary.
- **Card 4: Plan Roadmap Timeline**
  - Interactive status stepper displaying Plan 1 Foundation (Active/Complete), Plan 2 Events (Next), Plan 3 Sponsorships, and Plan 4 Reports.

---

## 3. Motion Engineering & Animation Spec (Emil Kowalski Framework)

```
+--------------------------+-----------------------+-----------------------------+-------------------------------+
| UI Interaction           | Animation Type        | Duration / Spring           | Easing / Transform            |
+--------------------------+-----------------------+-----------------------------+-------------------------------+
| Button Press Feedback    | Tactile Scale         | 150ms                       | scale(0.97) on :active        |
| Sidebar Open/Close       | Off-canvas Slide      | Spring (bounce: 0.15)       | translateX(-100%) -> 0        |
| Active Tab Indicator     | Layout Morphing       | Spring (stiffness: 350)     | layoutId="activeNavPill"      |
| Card Entry / Stagger     | Staged Fade + Slide   | 200ms                       | translateY(8px) + opacity     |
| Dropdown Menu Enter      | Origin-Aware Popover  | 180ms                       | scale(0.96) + opacity 0 -> 1  |
+--------------------------+-----------------------+-----------------------------+-------------------------------+
```

### Motion Code Rules

1. **No scale(0):** Popovers and modals enter from `scale(0.96)` and `opacity: 0`.
2. **Interruptibility:** Sidebar drawer uses Framer Motion spring physics so rapid toggling reverses smoothly without jank.
3. **GPU Acceleration:** Uses `transform: translate3d(0, 0, 0)` and CSS transitions for continuous UI elements to prevent main thread blocking during page loads.

---

## 4. Responsive Breakpoint Strategy

- **Desktop (`≥ 1024px`):**
  - Sidebar is pinned to the left (240px wide or 64px collapsed).
  - Dashboard cards render in a 3-column / 2-column grid.
- **Tablet (`768px - 1023px`):**
  - Sidebar converts to a sliding drawer (hidden by default).
  - Dashboard cards render in a 2-column grid.
- **Mobile (`< 768px`):**
  - Top bar shows hamburger menu icon.
  - Sidebar slides over as a full-height drawer.
  - Dashboard cards stack in a 1-column layout.
  - All interactive elements enforce minimum touch targets of `48px x 48px`.

---

## 5. Verification Plan

### Automated Checks

- `npm run lint` — 0 errors, 0 warnings
- `npm run format:check` — 100% clean formatting
- `npm run test` — All 31 tests passing
- `npm run build` — Clean Vite production build

### Manual & Visual Verification

- Browser subagent screenshot inspection on Desktop (`1920x1080`), Tablet (`768x1024`), and Mobile (`375x667`).
