---

name: sponsorsync-frontend-review
description: Review completed or changed SponsorSync React and Vite frontend code for correctness, asynchronous state bugs, API integration, accessibility, responsive layout, visual regressions, performance, error states, and test quality. Activate when asked to review, audit, debug, verify, QA, polish, or approve frontend pages, components, frontend diffs, or completed UI milestones. Do not activate for creating a new UI from scratch unless a post-implementation review is also requested.
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# SponsorSync Frontend Review

## Purpose

Perform a focused, evidence-based review of completed or changed SponsorSync frontend work.

This skill reviews implementation. It does not replace the implementation plan, redesign approved functionality, or introduce unrelated visual preferences.

## Required Companion Skills

After activation, inspect available skills and activate these when present:

1. `code-reviewer`
2. `frontend-testing-debugging`
3. `vercel-react-best-practices`

Activate `impeccable` only when the request includes visual polish, interaction polish, UX quality, or final design approval.

Activate `ui-ux-pro-max` only when reviewing design-system consistency, responsive rules, accessibility patterns, or shared components.

Do not activate both `frontend-design` and `design-taste-frontend` during an ordinary review. They are creation and design-direction skills, not default defect-review skills.

Use no more than three companion skills initially.

## Review Boundary

Before reviewing:

1. Read the current user request.
2. Read the relevant SponsorSync implementation-plan milestone.
3. Inspect `git status`.
4. Inspect the actual frontend diff.
5. Identify all changed frontend files.
6. Identify affected backend endpoints and response formats.
7. Read existing related components, hooks, API modules, and tests.

Review the changed behavior, not only the changed lines.

Do not edit code unless the user requested fixes.

## SponsorSync Architecture Checks

Verify that:

* React uses the existing Vite and JavaScript architecture.
* No TypeScript files or TypeScript-only tooling were introduced.
* React communicates only with the Express API.
* Database credentials and Supabase service credentials are not exposed to the frontend.
* Frontend role checks are treated as UX behavior, not security.
* API access uses the repository’s shared API client.
* Authentication state follows the established project pattern.
* Direct URL navigation to protected pages is handled correctly.
* Session expiration and unauthorized responses are handled.
* Existing response envelopes and error shapes are respected.

## Functional Correctness

Review:

* Incorrect state initialization
* Stale state
* Missing dependency handling
* Race conditions between requests
* Duplicate submission
* Failure to cancel or ignore obsolete requests
* Incorrect loading-state transitions
* Form reset problems
* Incorrect optimistic updates
* Missing cache invalidation
* Incorrect route parameters
* Broken pagination, sorting, or filters
* Incorrect numeric and currency handling
* Date and timezone errors
* Refresh behavior
* Empty data
* Partial API responses
* Permission changes during an active session

Trace each main workflow from user action to API request to rendered result.

## SponsorSync Workflow Checks

When relevant, verify:

* Event selection is preserved correctly.
* Members see only the UI appropriate to their role.
* Company assignment state is rendered accurately.
* The UI does not imply a claim succeeded before backend confirmation.
* Conflict responses from sponsor assignment are visible and understandable.
* Sponsorship statuses match backend-supported values.
* Requested, offered, approved, and received values are not mixed.
* In-kind sponsorships do not incorrectly require cash values.
* Follow-up dates and overdue states are correct.
* Interaction timelines remain chronological.
* File access errors are handled safely.
* Leaderboard and dashboard figures use backend-calculated data where expected.
* Archived and inactive records are represented correctly.

## Form Review

Verify:

* Required fields are clearly indicated.
* Client validation matches backend validation without pretending to replace it.
* Submit buttons prevent accidental duplicate requests.
* Server-side field errors are displayed.
* General server errors are displayed.
* Values are not lost unnecessarily after a failed submission.
* Destructive actions require appropriate confirmation.
* Numeric fields reject invalid, negative, or malformed values.
* Date fields have valid boundaries.
* Select options handle loading and empty states.
* Forms are usable by keyboard.

## API and Error-State Review

For every affected request, verify:

* Loading state
* Success state
* Empty state
* Validation error
* Unauthorized response
* Forbidden response
* Not-found response
* Conflict response
* Server error
* Network failure
* Retry behavior where appropriate

Do not accept a page that only works on the happy path.

## Accessibility Review

Check:

* Semantic HTML
* Labels connected to inputs
* Keyboard access
* Visible focus
* Correct button elements
* Accessible modal behavior
* Escape-key behavior
* Focus restoration
* Meaningful headings
* Sufficient text alternatives
* Errors announced or clearly associated with fields
* Status changes understandable without color alone
* Tables with appropriate headers
* Charts with accompanying textual information

Treat accessibility failures that block task completion as material findings.

## Responsive Review

Verify at representative widths:

* Mobile
* Tablet
* Desktop

Check:

* Navigation
* Tables
* Forms
* Modals
* Dashboard cards
* Charts
* Long company names
* Long email addresses
* Currency values
* Status badges
* Action menus
* Interaction timelines

Avoid fixing overflow by hiding important content.

## React Engineering Review

Use applicable React best practices to check:

* Unnecessary rerenders
* Incorrect effect usage
* Derived state stored unnecessarily
* Unstable object and function dependencies
* Expensive calculations in render
* Oversized components with mixed responsibilities
* Duplicate server state
* Waterfall requests
* Unnecessary bundle additions
* Poor route-level loading
* Missing cleanup
* Incorrect keys
* State updates after unmount
* Repeated API logic that belongs in shared modules

Do not demand refactoring when there is no measurable correctness, clarity, or performance benefit.

## Visual and UX Review

When requested, inspect:

* Visual hierarchy
* Consistent spacing
* Consistent typography
* Action priority
* Clear primary and secondary actions
* Status clarity
* Useful empty states
* Calm and restrained motion
* Consistent cards, forms, tables, and modals
* Avoidance of generic dashboard clutter
* Confirmation and feedback after important actions

Do not redesign the entire application during a scoped review.

## Required Testing

Inspect existing scripts before choosing commands.

Run the narrowest relevant tests, then broader checks such as:

* Component tests
* Frontend unit tests
* Integration tests
* Vite production build
* Existing lint command
* Browser workflow tests

For browser verification, exercise the real workflow rather than only opening the page.

At minimum, verify:

* Correct role
* Wrong role
* Empty data
* API failure
* Validation failure
* Mobile layout
* Direct URL access
* Refresh behavior

## Review Output

Start with findings, ordered by severity.

For every finding include:

* Severity: P0, P1, P2, or P3
* File and exact line
* Defect
* User or system impact
* Evidence or reproduction
* Recommended correction
* Test that should prove the fix

Then include:

* Checks performed
* Commands run
* Browser scenarios tested
* Skills applied
* Remaining unverified areas

Do not hide material problems inside a general summary.

When no material issues are found, say:

“No material frontend defects found in the reviewed scope.”

Then state what was inspected and what could not be verified.
