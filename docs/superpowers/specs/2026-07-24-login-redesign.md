# SponsorSync Design Spec: Login System Frontend Redesign (Zinc Dark Monochrome)

**Date:** 2026-07-24  
**Topic:** Re-styling and UX enhancement of authentication pages (`LoginPage`, `ChangePasswordPage`, `UnauthorizedPage`).  
**Style System:** High-Contrast Dark Zinc & Black, zero AI slop, zero generic gradients.

---

## 1. Overview & Objectives

Redesign the authentication pages of SponsorSync with a sleek, authentic, dark Zinc aesthetic while preserving 100% of existing logic, form states, API bindings, and routing behaviors ("keeping the wires good").

### Key Principles

1. **Zinc Dark Aesthetic:** Built on `#09090b` (deep background), `#18181b` (surface cards), and `#27272a` (monochrome hairline borders).
2. **Typography & Hierarchy:** High contrast white headings (`#ffffff`), secondary labels (`#a1a1aa`), tracking on badges, clean input focus outlines (`#ffffff`).
3. **No AI Slop:** No floating blob gradients, no uncalibrated glassmorphism, no generic template styles. Pure precision geometry and tactile micro-interactions.
4. **Wire Safety:** Preserve all `useAuth()`, `authApi`, `useNavigate()`, state hooks, validation checks, and route guards.

---

## 2. Component Design & Layout

### 2.1 Theme Configuration (`client/src/main.jsx`)

- Create a dedicated MUI dark theme with custom palette defaults matching Zinc:
  - `palette.mode`: `'dark'`
  - `palette.background.default`: `'#09090b'`
  - `palette.background.paper`: `'#18181b'`
  - `palette.primary.main`: `'#fafafa'`
  - `palette.text.primary`: `'#f4f4f5'`
  - `palette.text.secondary`: `'#a1a1aa'`
  - Custom input focus & button border overrides.

### 2.2 Login Page (`client/src/pages/LoginPage.jsx`)

- **Brand Header:** Sleek minimalist `[S]` logo icon with bold tracking for "SPONSORSYNC".
- **Subheader:** Muted label: "Enter your credentials to access your workspace."
- **Form Controls:**
  - Email field (`type="email"`, auto-focus, dark zinc background).
  - Password field (`type="password"` / `type="text"` toggle with show/hide eye icon).
  - Error Alert: Dark red/zinc container (`rgba(239, 68, 68, 0.1)` with `#ef4444` border and `#fca5a5` text).
  - Submit Button: Full-width solid white (`#fafafa`) button with black text (`#09090b`), active scale micro-interaction, disabled loading state with spinner.

### 2.3 Change Password Page (`client/src/pages/ChangePasswordPage.jsx`)

- **Header:** "Update Password" badge and security policy note.
- **Form Controls:**
  - Current Password, New Password, Confirm Password with visibility toggles.
  - Dynamic password mismatch helper text.
  - Clean submit button and error handling.

### 2.4 Unauthorized Page (`client/src/pages/UnauthorizedPage.jsx`)

- **Header:** "Access Restricted" with warning badge.
- **Body:** Clear role description (`Your role [ROLE] does not have access...`).
- **Actions:** Button to return to dashboard or log out.

---

## 3. Verification & Quality Plan

1. **Functional Integrity:** Run `npm run test` (verify all 28 tests pass).
2. **Lint & Formatting:** Run `npm run lint` and `npm run format:check`.
3. **Production Build:** Run `npm run build` to confirm zero build errors.
