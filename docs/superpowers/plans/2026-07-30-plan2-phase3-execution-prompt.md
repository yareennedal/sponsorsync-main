# Plan 2 Phase 3 Execution Prompt: Event Frontend

Use this prompt to execute only Plan 2 Phase 3 on branch `feature/plan2-events-companies`.

## Skills To Use

- `executing-plans` for following this prompt task by task.
- `how-to-write-component` for React component ownership and state boundaries.
- `vercel-react-best-practices` for avoiding avoidable effects, memoization, and bundle mistakes.
- `accessibility` for form labels, icon button names, keyboard-friendly controls, and alert roles.
- `vitest-testing` for focused client tests.

`design-taste-frontend` is intentionally not used here: this is an authenticated operational tool,
not a landing page or visual redesign.

## Scope

Implement the event frontend only:

- Event API client methods.
- Event routes and navigation.
- Event list, create, edit, detail, member management, package management, and direct URL loading.
- Client tests for the event pages and navigation behavior.
- Living documentation/status updates for Phase 3.

Do not implement company pages, company APIs, sponsorship cases, assignments, interactions,
attachments, notifications, analytics, recommendations, or any schema migration.

## Backend Contract Baseline

Use the committed backend from:

- `13e9a9a feat: implement plan 2 event backend foundation`
- `355056f feat(events): add member candidate lookup`

Event endpoints:

- `GET /api/events?page=&pageSize=&search=&status=&fromDate=&toDate=`
- `POST /api/events`
- `GET /api/events/:eventId`
- `PATCH /api/events/:eventId`
- `PATCH /api/events/:eventId/status`
- `GET /api/events/:eventId/member-candidates?page=&pageSize=&search=&role=`
- `GET /api/events/:eventId/members`
- `POST /api/events/:eventId/members`
- `DELETE /api/events/:eventId/members/:userId`
- `GET /api/events/:eventId/packages`
- `POST /api/events/:eventId/packages`
- `PATCH /api/events/:eventId/packages/:packageId`
- `DELETE /api/events/:eventId/packages/:packageId`

Important shapes:

- Event detail returns `permissions`, `leader`, and active member summaries in `members`.
- Candidate lookup returns `id`, `fullName`, `email`, `role`, and `membershipStatus` (`NONE` or
  `INACTIVE`).
- Package delete deactivates the package; it does not hard-delete.
- All list endpoints use `{ success, data, meta }`.
- All frontend errors must use `getErrorMessage(err, fallback)`.

## Files

Modify:

- `client/src/api/index.js`
- `client/src/App.jsx`
- `client/src/layouts/AppShell.jsx`
- `docs/implementation-status.md`
- `plans/02-events-companies-and-team-management.md`
- `docs/superpowers/plans/2026-07-29-plan2-events-companies-phases.md`

Create:

- `client/src/features/events/EventsPage.jsx`
- `client/src/features/events/EventFormPage.jsx`
- `client/src/features/events/EventDetailPage.jsx`
- `client/src/features/events/eventConstants.js`
- `client/src/features/events/eventFormatters.js`
- `client/src/features/events/EventsPage.test.jsx`
- `client/src/features/events/EventDetailPage.test.jsx`

Create extra local components only when they keep the pages readable. Keep them inside
`client/src/features/events/`.

## Implementation Steps

1. Add `eventApi` to `client/src/api/index.js`.
   - Use the existing Axios wrapper.
   - Keep params blank-compatible like `userApi.list`.
   - Include package and member-candidate methods.

2. Add event constants/formatters.
   - Arabic status labels and tones.
   - Create-status options: `DRAFT`, `ACTIVE`.
   - Full status options for status transition controls.
   - JOD formatter with Latin digits.
   - Date-only formatter that avoids timezone/time display drift.
   - Comma/newline parsing for target sectors and cities.

3. Add routes and navigation.
   - Routes:
     - `/app/events`
     - `/app/events/new` (ADMIN/LEADER)
     - `/app/events/:eventId`
     - `/app/events/:eventId/edit` (ADMIN/LEADER)
     - `/app/events/:eventId/packages`
   - Add an Events nav item visible to all authenticated roles.
   - Preserve append-only shared-file convention; do not reorder existing users/profile routes.

4. Build `EventsPage`.
   - Search, status filter, date range filters, pagination, loading skeletons, empty states.
   - Columns: event name, category, date, leader, financial target, status, actions.
   - Create action visible only to ADMIN/LEADER.
   - Row edit action visible to ADMIN or the event leader.
   - Use Grid2 and logical CSS only.

5. Build `EventFormPage`.
   - Create/edit form for name, description, category, date, location, financial target,
     sponsorship deadline, target sectors, target cities, and initial status on create.
   - Admin create can select an active leader from `userApi.list({ role: 'LEADER', status:
'active' })`; leader create uses backend self-led behavior and does not show leader select.
   - Edit must not submit status or leader changes.
   - Preserve server validation messages.

6. Build `EventDetailPage`.
   - Fetch event detail and packages.
   - Show event summary, leader, status, target/deadline, active members/supervisors, packages,
     and a clear Plan 3 sponsorship-work placeholder.
   - Use `event.permissions` for edit/member/package controls.
   - Status updates call the status endpoint and reload the detail.
   - `/app/events/:eventId/packages` may render the same detail page with the package section
     available; no separate package-only page is required.

7. Build member management.
   - Admin/leader only.
   - Search users through `GET /api/events/:eventId/member-candidates`.
   - Never use a raw UUID text field.
   - Never widen or call `GET /api/users` for event team selection.
   - Show `membershipStatus: INACTIVE` as a reactivation candidate.
   - Add and remove members, then reload event detail and candidates.

8. Build package management.
   - Admin/leader only.
   - List packages ordered by backend.
   - Create/edit package fields: name, amount, benefits, displayOrder.
   - Delete means deactivate; label the action as removal/deactivation in Arabic.
   - Show optional empty state when no packages exist.

9. Add client tests.
   - `EventsPage` renders fetched rows, sends blank-compatible filters, and hides create for
     MEMBER.
   - `EventDetailPage` uses member-candidates for member selection, renders inactive candidates
     distinctly, and never needs a raw UUID input.
   - `AppShell` exposes the Events nav link to non-admin users.
   - Direct route render for event pages should not fall to NotFound.

10. Update docs.
    - Mark Event frontend implemented in Plan 2 progress.
    - Add Phase 3 surprise/decision notes only if implementation finds something real.
    - Update implementation status to Phase 3 complete locally.
    - Check the phased plan Phase 3 box language still matches what shipped.

## Verification

Run, in order:

```bash
npm run lint
npm run format:check
npm run test
npm run build
```

If a validation command fails, stop and fix it before continuing.

## Review Checklist

- No company/contact or Plan 3 sponsorship-case behavior added.
- No schema migrations.
- No React direct Supabase access.
- No `@mui/material/Grid` import with `size` props; use `@mui/material/Grid2`.
- No physical CSS in `sx` (`ml`, `mr`, `left`, `right`, `textAlign: 'right'`, etc.).
- Every catch block uses `getErrorMessage`.
- Icon-only buttons have Arabic accessible names.
- Member management consumes `member-candidates`, not `/api/users` and not a UUID box.
- Package removal maps to backend deactivation semantics.
- Tests assert behavior, not Arabic error-message strings.
