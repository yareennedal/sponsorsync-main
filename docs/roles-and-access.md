# SponsorSync Roles and Access

Four fixed roles. No dynamic permission table. Plan 1 established the global role set; Plan 2
adds event relationship checks on top of those roles.

## Roles

| Role         | Description                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| `ADMIN`      | Manages the platform: users, roles, account activation, audit logs, and events.       |
| `LEADER`     | Creates and manages events they lead, and manages companies/contacts in Plan 2.       |
| `MEMBER`     | Reads assigned events in Plan 2; works assigned sponsorship cases starting in Plan 3. |
| `SUPERVISOR` | Reads assigned events in Plan 2.                                                      |

## Plan 1 access matrix

| Endpoint                             |   ADMIN    | LEADER | MEMBER | SUPERVISOR |
| ------------------------------------ | :--------: | :----: | :----: | :--------: |
| `POST /api/auth/login`               | — (public) |   —    |   —    |     —      |
| `GET /api/auth/me`                   |     ✓      |   ✓    |   ✓    |     ✓      |
| `PATCH /api/auth/me`                 |     ✓      |   ✓    |   ✓    |     ✓      |
| `POST /api/auth/logout`              |     ✓      |   ✓    |   ✓    |     ✓      |
| `POST /api/auth/change-password`     |     ✓      |   ✓    |   ✓    |     ✓      |
| `GET /api/users`                     |     ✓      |   ✗    |   ✗    |     ✗      |
| `POST /api/users`                    |     ✓      |   ✗    |   ✗    |     ✗      |
| `PATCH /api/users/:id`               |     ✓      |   ✗    |   ✗    |     ✗      |
| `PATCH /api/users/:id/status`        |     ✓      |   ✗    |   ✗    |     ✗      |
| `POST /api/users/:id/reset-password` |     ✓      |   ✗    |   ✗    |     ✗      |
| `GET /api/health`                    |  — (open)  |   —    |   —    |     —      |

**Not implemented in Plan 1:** there is no `GET /api/audit-logs` endpoint and no audit-log UI.
Audit rows are written (14 call sites via `utils/audit.js`) but can only be read directly from
the database. An earlier version of this table listed the endpoint as shipped; it never existed.

## Plan 2 backend event access matrix

This matrix covers the backend event API shipped in Plan 2 Phase 2. Event membership means an
active row in `event_members`; the event leader is represented by `events.leader_id`, not by a
membership row.

| Endpoint                                      | ADMIN | LEADER            | MEMBER               | SUPERVISOR           |
| --------------------------------------------- | :---: | :---------------- | :------------------- | :------------------- |
| `GET /api/events`                             |   ✓   | Led active events | Member active events | Member active events |
| `GET /api/events?archived=true`               |   ✓   | ✗                 | ✗                    | ✗                    |
| `POST /api/events`                            |   ✓   | Self-led only     | ✗                    | ✗                    |
| `GET /api/events/:eventId`                    |   ✓   | Led events        | Member active events | Member active events |
| `PATCH /api/events/:eventId`                  |   ✓   | Led events        | ✗                    | ✗                    |
| `PATCH /api/events/:eventId/status`           |   ✓   | Led events        | ✗                    | ✗                    |
| `PATCH /api/events/:eventId/leader`           |   ✓   | ✗                 | ✗                    | ✗                    |
| `GET /api/events/:eventId/member-candidates`  |   ✓   | Led events        | ✗                    | ✗                    |
| `GET /api/events/:eventId/members`            |   ✓   | Led events        | Member active events | Member active events |
| `POST /api/events/:eventId/members`           |   ✓   | Led events        | ✗                    | ✗                    |
| `DELETE /api/events/:eventId/members/:userId` |   ✓   | Led events        | ✗                    | ✗                    |
| `GET /api/events/:eventId/packages`           |   ✓   | Led events        | Member active events | Member active events |
| `POST /api/events/:eventId/packages`          |   ✓   | Led events        | ✗                    | ✗                    |
| `PATCH /api/events/:eventId/packages/:id`     |   ✓   | Led events        | ✗                    | ✗                    |
| `DELETE /api/events/:eventId/packages/:id`    |   ✓   | Led events        | ✗                    | ✗                    |

Archived events are excluded from normal lists. Direct archived-event reads are allowed for ADMIN
and the event leader, but not for MEMBER/SUPERVISOR membership reads. Restoring an archived event
to `ACTIVE` is ADMIN-only in this MVP.

## Plan 2 backend company access matrix

Companies are a shared directory, not event-private records. All authenticated roles can read
active companies and contacts. Write access stays conservative in Plan 2: Admin and Leader only.

| Endpoint                                                          | ADMIN |    LEADER    | MEMBER | SUPERVISOR |
| ----------------------------------------------------------------- | :---: | :----------: | :----: | :--------: |
| `GET /api/companies`                                              |   ✓   |      ✓       |   ✓    |     ✓      |
| `GET /api/companies?archived=true`                                |   ✓   |      ✗       |   ✗    |     ✗      |
| `GET /api/companies/duplicates`                                   |   ✓   |      ✓       |   ✓    |     ✓      |
| `POST /api/companies`                                             |   ✓   |      ✓       |   ✗    |     ✗      |
| `GET /api/companies/:companyId`                                   |   ✓   |      ✓       |   ✓    |     ✓      |
| `PATCH /api/companies/:companyId`                                 |   ✓   |      ✓       |   ✗    |     ✗      |
| `PATCH /api/companies/:companyId/archive`                         |   ✓   | Archive only |   ✗    |     ✗      |
| `GET /api/companies/:companyId/contacts`                          |   ✓   |      ✓       |   ✓    |     ✓      |
| `POST /api/companies/:companyId/contacts`                         |   ✓   |      ✓       |   ✗    |     ✗      |
| `PATCH /api/companies/:companyId/contacts/:contactId`             |   ✓   |      ✓       |   ✗    |     ✗      |
| `PATCH /api/companies/:companyId/contacts/:contactId/archive`     |   ✓   |      ✓       |   ✗    |     ✗      |
| `POST /api/companies/:companyId/contacts/:contactId/make-primary` |   ✓   |      ✓       |   ✗    |     ✗      |

`PATCH /api/companies/:companyId/archive` uses `{ archived: true | false }`. Admin and Leader
can archive; restore with `{ archived: false }` is Admin-only in the MVP. Contact archive/restore
is Admin/Leader.

### Credentials and identity are admin-controlled — this is deliberate

`POST /api/auth/login` is the **only** public endpoint in the whole API (`/api/health` aside),
and `PATCH /auth/me` accepts `fullName` and nothing else. That is the entire self-service
surface.

Two OTP flows shipped in Plan 1 and were **removed** afterwards:

| Removed flow                                                              | Replaced by                                     |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| `forgot-password` → `verify-otp` → `reset-password-otp` (unauthenticated) | `POST /api/users/:id/reset-password` (ADMIN)    |
| `change-email/request` → `change-email/confirm` (authenticated)           | `PATCH /api/users/:id` with `{ email }` (ADMIN) |

The reasoning is the same for both. SponsorSync is an internal tool: there is no public sign-up,
every account is created by an admin, and a user who is locked out or needs an address changed
reaches an admin through the company. Both flows therefore duplicated something the admin routes
already did — while depending on a mail sender the project does not have, which made them
unusable by a real user in any case. The password flow additionally cost three unauthenticated
public endpoints that handed out account-recovery codes.

**A locked-out user is recovered like this:** an ADMIN calls
`POST /api/users/:id/reset-password` with a temporary password and passes it on out of band.
That sets `must_change_password`, which middleware enforces on every route, and bumps
`token_version`, killing every session the account already had. The user logs in once with the
temporary password and is forced to choose a new one.

**An email change works the same way:** an ADMIN calls `PATCH /api/users/:id` with a new
`email`. Because email is the login identity, that also bumps `token_version` — a session opened
against the old address does not survive the change.

Do not re-add either flow without a mail sender and a fresh security review.
`server/tests/auth.test.js` and `server/tests/profile.test.js` assert all five routes stay
unmounted.

Other self-service caveats enforced server-side:

- A user with `mustChangePassword` set gets 403 `AUTH_PASSWORD_CHANGE_REQUIRED` everywhere
  except change-password, logout, and `GET /auth/me`.
- An ADMIN cannot deactivate themselves, change their own role, or reset their own password
  through `/api/users` — the last one would bypass the `currentPassword` proof that
  `/auth/change-password` requires.

## Frontend navigation (Plan 1)

- All roles: Dashboard (`/app`), Profile (`/app/profile`), Change password (`/change-password`).
- `ADMIN` only: Users (`/app/users`).
- Public: Login (`/login`), Unauthorized (`/unauthorized`).
- No links for events, companies, or sponsorships until Plan 2.

## Enforcement

- The backend `authorizeRoles(...allowedRoles)` middleware is the authority.
- The frontend hides controls for UX only. A hidden control is not security; a direct API call from a non-admin must still return `403`.
- The authenticated admin cannot remove their own final administrative access if no other active admin exists, and cannot deactivate themselves.
