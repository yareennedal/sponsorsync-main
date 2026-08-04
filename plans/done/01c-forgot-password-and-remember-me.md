> **Status: COMPLETE — archived. Half of it was later REMOVED.** Kept for history only.
> It is not a brief for new work. Do not implement from it.
>
> **The Forgot Password OTP half was deleted from the product after Plan 1b** (routes, service,
> validators, page, `password_reset_otps` table via migration `0006`). SponsorSync is an internal
> tool with no public sign-up: a locked-out user asks an admin, who issues a temporary password
> through `POST /api/users/:id/reset-password`. That path already forces a change and kills every
> live session, so the OTP flow duplicated it while adding an unauthenticated public surface that
> could not work without a mail sender. Rationale: `docs/roles-and-access.md`. The accompanying
> design spec was deleted with it. **Remember Me survives and is still in use.**

# Implementation Plan: Self-Service Forgot Password OTP & Remember Me Features

**Target:** Enhancement to Plan 1 Auth Foundation  
**Design Spec:** deleted along with the feature.  
**Status:** Shipped, then partially reverted (see banner)

---

## Task Breakdown & Execution Milestones

### Milestone 1: Database Schema & Migration (`server/migrations/`)

- [ ] Create migration `0003-create-password-reset-otps.js` with `password_reset_otps` table definition.
- [ ] Define Sequelize model `PasswordResetOtp.js` in `server/src/models/PasswordResetOtp.js` and register associations in `server/src/models/index.js`.
- [ ] Test migration up and down using `npm run db:migrate` and `npm run db:migrate:undo`.

### Milestone 2: Backend Controllers, Validators & Services (`server/src/`)

- [ ] Update `server/src/utils/cookies.js` to accept `rememberMe` flag and set `maxAge = 30 days` if `true`, or `undefined` (session cookie) if `false`.
- [ ] Update `server/src/services/authService.js` and `server/src/routes/authRoutes.js` for login with `rememberMe`.
- [ ] Create `server/src/validators/otpValidators.js` for email, OTP format, and strong password checks.
- [ ] Implement `forgotPassword()`, `verifyOtp()`, and `resetPasswordWithOtp()` in `server/src/services/authService.js`:
  - Enforce OWASP generic response messaging and timing attack defense for missing emails.
  - Enforce 10-minute expiration, max 5 failed attempt lockouts, SHA-256 OTP hashing, and `token_version` increment.
  - Log `[DEV OTP]` in `NODE_ENV !== 'production'`.
- [ ] Register routes `POST /api/auth/forgot-password`, `POST /api/auth/verify-otp`, `POST /api/auth/reset-password-otp` in `server/src/routes/authRoutes.js`.

### Milestone 3: Frontend "Remember Me" & 4-Step OTP Wizard (`client/src/`)

- [ ] Update [`client/src/pages/LoginPage.jsx`](file:///d:/graduation/client/src/pages/LoginPage.jsx) to add _تذكرني على هذا الجهاز_ checkbox and _نسيت كلمة المرور؟_ link navigating to `/forgot-password`.
- [ ] Create [`client/src/pages/ForgotPasswordPage.jsx`](file:///d:/graduation/client/src/pages/ForgotPasswordPage.jsx) with 4-step wizard state machine (Email -> OTP & 60s timer -> New Password -> Success).
- [ ] Apply Apple spring animations, IBM Plex Sans Arabic typography, and White/Zinc translucent paper styling.
- [ ] Register `/forgot-password` route in [`client/src/routes/guards.jsx`](file:///d:/graduation/client/src/routes/guards.jsx) and [`client/src/App.jsx`](file:///d:/graduation/client/src/App.jsx).

### Milestone 4: Integration Tests & Validation

- [ ] Add backend automated test cases in `server/tests/auth.test.js` covering:
  - OWASP generic response for non-existent email.
  - OTP creation, wrong OTP attempt incrementing, and 5-attempt lock out.
  - Password reset with `token_version` bump.
  - Remember Me 30-day cookie vs session cookie behavior.
- [ ] Add frontend test in `client/src/App.test.jsx`.
- [ ] Execute full validation suite: `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.

---

## Verification Plan

### Automated Validation Commands

1. `npm run lint`
2. `npm run format:check`
3. `npm run test`
4. `npm run build`

### Manual Inspection via Browser Subagent

- Verify `/forgot-password` UI in Chrome with browser subagent screenshot.
- Verify 60s timer, error shake, and password reset flow.
