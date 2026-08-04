# SponsorSync Execution Plans

This file defines the durable execution-plan format used by all four SponsorSync implementation plans. The plan documents themselves live in `plans/` at the repo root (e.g. `plans/01-foundation-auth-and-agent-workflow.md`). Each plan is durable project memory, not a throwaway spec.

## Required plan format

Every implementation plan must contain:

1. **Purpose and Big Picture** — what exists at the end and why.
2. **Prerequisites** — what must already work (prior plans / artifacts to preserve).
3. **Scope** — Included, Excluded, and (for later plans) Optional.
4. **Fixed Technical Decisions** — choices that cannot change without a Decision Log entry.
5. **Database / domain definitions** — tables, constraints, domain terms.
6. **API conventions** applied in this plan.
7. **Milestones** — each with required work and acceptance behavior.
8. **Required Commands** — exact validation commands.
9. **Validation and Acceptance** — the criteria that make the plan "done."
10. **Idempotence and Recovery** — safe reruns and failure handling.
11. **Handoff** — what the next plan needs.
12. **Living sections** (updated during execution, not backfilled at the end):
    - **Progress** — checkbox list.
    - **Surprises and Discoveries** — unexpected behavior with evidence.
    - **Decision Log** — decisions + rationale + date/author.
    - **Outcomes and Retrospective** — completed at plan finish.

## Operating rules

- Plans execute sequentially. Do not begin plan N+1 until plan N passes acceptance and its migrations are applied to the shared Supabase dev database.
- **One plan, one owner.** Each plan is carried end to end by a single person — migrations, backend, frontend, tests, docs, and the plan's own living sections. Plan N+1's owner starts when plan N is accepted. Owners and the handoff checklist are in `docs/team-model.md`. Each plan lists four _areas_; those are concerns for its one owner to cover, not four concurrent people.
- A plan is a living document. Keep its living sections accurate while implementing.
- Failed validation blocks the next milestone. Do not advance on red.
- When a defect is found in an earlier layer, repair it in a focused commit and record it in the current plan's _Surprises and Discoveries_ — do not rewrite the foundation.
