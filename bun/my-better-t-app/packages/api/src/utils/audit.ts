import { db } from "@my-better-t-app/db";
import { auditLog } from "@my-better-t-app/db/schema/audit";

export async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId: string | number,
  details?: Record<string, any>,
) {
  try {
    await db.insert(auditLog).values({
      userId,
      action,
      entityType,
      entityId: String(entityId),
      details,
    });
  } catch (error) {
    console.error("Failed to log audit:", error);
  }
}
