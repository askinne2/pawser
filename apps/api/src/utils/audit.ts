import { prisma } from '@pawser/database';

/**
 * Audit log entry types
 */
export type AuditAction =
  | 'tenant_access'
  | 'api_call'
  | 'credential_update'
  | 'settings_update'
  | 'sync_triggered'
  | 'sync_completed'
  | 'sync_failed'
  | 'authentication'
  | 'authorization_failed';

/**
 * Log audit event
 * All audit logs are tenant-scoped for isolation
 */
export async function auditLog(
  organizationId: string,
  action: AuditAction,
  details: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    // In a production system, you'd have an audit_logs table
    // For MVP, we'll log to console and optionally to a file
    const logEntry = {
      timestamp: new Date().toISOString(),
      organizationId,
      action,
      ...details,
    };

    // Console logging (in production, use a proper logging service)
    console.log('[AUDIT]', JSON.stringify(logEntry));

    // TODO: Store in audit_logs table when implemented
    // await prisma.auditLog.create({
    //   data: {
    //     organizationId,
    //     action,
    //     userId: details.userId,
    //     ipAddress: details.ipAddress,
    //     userAgent: details.userAgent,
    //     resource: details.resource,
    //     metadata: details.metadata as object,
    //   },
    // });
  } catch (error) {
    // Don't throw - audit logging should never break the application
    console.error('Audit logging failed:', error);
  }
}

/**
 * Get audit logs for an organization (admin only)
 */
export async function getAuditLogs(
  organizationId: string,
  limit = 100
): Promise<unknown[]> {
  // TODO: Implement when audit_logs table is added
  return [];
}

