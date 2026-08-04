import { AuditLog } from '../models/index.js';

// Append-only audit. Never expose update/delete endpoints for audit_logs.
//
// Pass `transaction` so the audit row commits with the mutation it describes. Callers used
// to write the mutation, commit, then write the audit row separately: a failure on the
// second write returned 500 while the first was already durable, leaving (for example) a
// role escalation live with no trail. Plan 3 requires this pattern for money fields.
//
// There is deliberately no fallback that rewrites a failed FK as actorUserId: null. That
// turned an integrity failure into a permanently unattributable row, which defeats the point
// of the log. resolveActorId() in userService checks the actor up front instead.
export async function createAuditLog(
  { actorUserId, action, entityType, entityId, beforeValues, afterValues, metadata },
  { transaction } = {},
) {
  return AuditLog.create(
    {
      actorUserId,
      action,
      entityType,
      entityId,
      beforeValues: beforeValues ?? null,
      afterValues: afterValues ?? null,
      metadata: metadata ?? null,
    },
    { transaction },
  );
}
