# SponsorSync API Conventions

Every endpoint is prefixed with `/api`.

## Success responses

Single resource:

    {
      "success": true,
      "data": { ... }
    }

Paginated list:

    {
      "success": true,
      "data": [ ... ],
      "meta": {
        "page": 1,
        "pageSize": 20,
        "total": 42,
        "totalPages": 3
      }
    }

## Error responses

    {
      "success": false,
      "error": {
        "code": "AUTH_INVALID_CREDENTIALS",
        "message": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
        "details": null
      }
    }

`code` is a stable machine-readable string (`SCREAMING_SNAKE_CASE`). `details` is `null` or a
validation breakdown (Zod field errors as `[{ path, message }]`).

**`message` is Arabic and user-facing.** The UI renders it verbatim, so it is copy, not
diagnostics. Two consequences: never write an English message on a user-reachable path (Zod's
built-in messages are English — always pass your own), and **clients must branch on `code`,
never on `message`**. The one exception is `/api/health`, which is read by operators and
monitoring and stays English.

### Envelope shape

A single resource is returned **bare in `data`** — `{ success: true, data: {...} }`. The four
auth endpoints that return a user wrap it as `data.user` for historical reasons. Do not add new
wrappers: new endpoints put the resource directly in `data`.

## Event endpoints (Plan 2 backend)

Phase 2 of Plan 2 adds the backend event API only. Client routes and company/contact APIs are
separate later milestones.

| Method | Endpoint                                   | Response shape    |
| ------ | ------------------------------------------ | ----------------- |
| GET    | `/api/events`                              | Paginated list    |
| POST   | `/api/events`                              | Single event      |
| GET    | `/api/events/:eventId`                     | Single event      |
| PATCH  | `/api/events/:eventId`                     | Single event      |
| PATCH  | `/api/events/:eventId/status`              | Single event      |
| PATCH  | `/api/events/:eventId/leader`              | Single event      |
| GET    | `/api/events/:eventId/member-candidates`   | Paginated list    |
| GET    | `/api/events/:eventId/members`             | List              |
| POST   | `/api/events/:eventId/members`             | Single membership |
| DELETE | `/api/events/:eventId/members/:userId`     | Single membership |
| GET    | `/api/events/:eventId/packages`            | List              |
| POST   | `/api/events/:eventId/packages`            | Single package    |
| PATCH  | `/api/events/:eventId/packages/:packageId` | Single package    |
| DELETE | `/api/events/:eventId/packages/:packageId` | Single package    |

## Company endpoints (Plan 2 backend)

Phase 5 of Plan 2 adds the company/contact API. React must consume these endpoints through the
shared Axios client; it must not query Supabase directly.

| Method | Endpoint                                                     | Response shape |
| ------ | ------------------------------------------------------------ | -------------- |
| GET    | `/api/companies`                                             | Paginated list |
| GET    | `/api/companies/duplicates`                                  | List           |
| POST   | `/api/companies`                                             | Single company |
| GET    | `/api/companies/:companyId`                                  | Single company |
| PATCH  | `/api/companies/:companyId`                                  | Single company |
| PATCH  | `/api/companies/:companyId/archive`                          | Single company |
| GET    | `/api/companies/:companyId/contacts`                         | List           |
| POST   | `/api/companies/:companyId/contacts`                         | Single contact |
| PATCH  | `/api/companies/:companyId/contacts/:contactId`              | Single contact |
| PATCH  | `/api/companies/:companyId/contacts/:contactId/archive`      | Single contact |
| POST   | `/api/companies/:companyId/contacts/:contactId/make-primary` | Single contact |

High-confidence duplicate create/update conflicts return:

    {
      "success": false,
      "error": {
        "code": "COMPANY_DUPLICATE_HIGH_CONFIDENCE",
        "message": "...",
        "details": {
          "matches": [
            {
              "companyId": "...",
              "name": "Jordan Telecom",
              "confidence": "HIGH",
              "reasons": ["same website domain"]
            }
          ]
        }
      }
    }

The UI may render `details.matches`, but must still branch on `error.code`.
`GET /api/companies/duplicates` accepts `name`, `website`, `generalEmail`/`email`, `phone`,
`city`, and optional `excludeCompanyId`; edit forms must pass the current company id so a company
does not warn about itself.

### Error code catalogue

Codes are `DOMAIN_THING_STATE`. Reuse an existing code before inventing one; add new ones to
this table in the same PR that introduces them.

| Code                                   |             Status             | Meaning                                                               |
| -------------------------------------- | :----------------------------: | --------------------------------------------------------------------- |
| `VALIDATION_ERROR`                     |              400               | Request failed a Zod schema. `details` carries the field errors.      |
| `AUTH_INVALID_CREDENTIALS`             |              401               | Wrong email or password. Deliberately identical for both.             |
| `AUTH_REQUIRED`                        |              401               | No session cookie.                                                    |
| `AUTH_INVALID_TOKEN`                   |              401               | Cookie present but expired, malformed, or its user is gone.           |
| `AUTH_TOKEN_VERSION_MISMATCH`          |              401               | Session invalidated (password/email/role change, deactivation).       |
| `AUTH_ACCOUNT_DISABLED`                | 401 on a session, 403 at login | Account deactivated.                                                  |
| `AUTH_FORBIDDEN`                       |              403               | Authenticated but the role is not permitted.                          |
| `AUTH_PASSWORD_CHANGE_REQUIRED`        |              403               | Temporary password not yet changed.                                   |
| `AUTH_WRONG_PASSWORD`                  |              400               | `currentPassword` did not match.                                      |
| `AUTH_PASSWORD_REUSE`                  |              400               | New password equals the old one.                                      |
| `USER_NOT_FOUND`                       |              404               | No user with that id.                                                 |
| `USER_EMAIL_TAKEN`                     |              409               | Email already registered.                                             |
| `USER_SELF_DEACTIVATE`                 |              409               | An admin cannot deactivate their own account.                         |
| `USER_SELF_ROLE_CHANGE`                |              409               | An admin cannot change their own role.                                |
| `USER_SELF_RESET`                      |              409               | An admin cannot reset their own password via `/api/users`.            |
| `USER_LAST_ADMIN`                      |              409               | Would leave no active admin. Defence in depth: unreachable over HTTP. |
| `USER_LEADS_ACTIVE_EVENTS`             |              409               | User cannot be deactivated while leading active events.               |
| `EVENT_NOT_FOUND`                      |              404               | Event is missing or hidden from this user.                            |
| `EVENT_STATUS_TRANSITION_INVALID`      |              422               | Requested event status transition is not allowed.                     |
| `EVENT_LEADER_INVALID`                 |              400               | Selected event leader is missing, inactive, or invalid.               |
| `EVENT_MEMBER_USER_INVALID`            |              400               | Event member target is inactive or has the wrong role.                |
| `EVENT_MEMBER_LEADER_CONFLICT`         |              409               | Event leader cannot also be added as event member.                    |
| `EVENT_MEMBER_NOT_FOUND`               |              404               | Event membership is missing or already inactive.                      |
| `EVENT_PACKAGE_NOT_FOUND`              |              404               | Sponsorship package is missing for that event.                        |
| `EVENT_PACKAGE_NAME_TAKEN`             |              409               | Active package name already exists in that event.                     |
| `COMPANY_NOT_FOUND`                    |              404               | Company is missing.                                                   |
| `COMPANY_DUPLICATE_HIGH_CONFIDENCE`    |              409               | Company create/update matched a high-confidence duplicate.            |
| `COMPANY_CONTACT_NOT_FOUND`            |              404               | Company contact is missing or archived for active-contact operations. |
| `RESOURCE_CONFLICT`                    |              409               | A unique constraint fired (check-then-insert race).                   |
| `NOT_FOUND`                            |              404               | No such route.                                                        |
| `DB_NOT_CONFIGURED` / `DB_UNREACHABLE` |              503               | Health check only.                                                    |
| `INTERNAL_ERROR`                       |              500               | Anything unhandled. Never carries internal detail.                    |

`INTERNAL_ERROR` is the only code a 500 ever returns — driver codes such as `23505` or
`ECONNREFUSED` are deliberately not echoed to the client.

## Layer responsibilities

- Route handlers are thin inline `asyncHandler` closures. They translate HTTP input and output
  only. There is no `controllers/` directory and none should be added.
- Services contain business rules and database transactions. Each mutation and its audit row
  share one `sequelize.transaction()`.
- Models contain Sequelize definitions and associations, not business workflows.
- Validators define request schemas with Zod.
- Middleware handles authentication, authorization, validation, and errors.

## Error leakage

- Never leak raw Sequelize, PostgreSQL, JWT, or stack-trace details to clients.
- Log server-side errors with a request identifier.
- Use centralized `errorHandler` middleware registered last.

## HTTP status codes

- `400` — malformed input (validation failure, bad shape).
- `401` — missing or invalid authentication.
- `403` — authenticated user without permission.
- `404` — inaccessible or missing resource (use 404, not 403, when the user must not know the resource exists).
- `409` — state or uniqueness conflict (duplicate email, duplicate case).
- `422` — semantically invalid transition (invalid status move).
- `500` — unexpected failure.

## Authorization note

Frontend may hide unauthorized controls for UX, but hidden controls are not security. Every protected operation is also rejected by backend middleware or service rules. Direct API calls from a non-admin must still fail.
