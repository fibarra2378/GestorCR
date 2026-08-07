import { prisma } from '../db';

export interface AuditLogOptions {
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  details?: string;
}

export class AuditService {
  /**
   * Log an audit action to PostgreSQL
   */
  static async log({ action, entity, entityId, userId, details }: AuditLogOptions): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action,
          entity,
          entityId,
          userId,
          details
        }
      });
    } catch (error) {
      console.error('[AUDIT LOG ERROR]', error);
    }
  }

  /**
   * Get audit logs for a specific entity or overall
   */
  static async getLogs(entity?: string, entityId?: string, limit = 50) {
    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, username: true }
        }
      }
    });
  }
}
