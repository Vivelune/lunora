import "server-only";
import prisma from "./prisma";

type AuditDetails = Record<string, string | number | boolean | null>;

/**
 * Records who did what. A failure to write the log is reported to the server
 * console but never blocks the admin's action.
 */
export async function writeAuditLog(entry: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: AuditDetails;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        details: entry.details,
      },
    });
  } catch (error) {
    console.error("audit log failed:", error instanceof Error ? error.name : "unknown");
  }
}