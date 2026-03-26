import { Router, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { scheduleSync } from '../jobs/sync-animals';
import { prisma } from '@pawser/database';

const router = Router();

/**
 * POST /sync/:organizationId
 * Trigger manual sync for an organization (admin only)
 */
router.post(
  '/:organizationId',
  authenticate,
  requireRole('super_admin', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { organizationId } = req.params;
      // Only use userId if it's a valid UUID (not the dev bypass fake ID)
      const userId = req.user?.id && req.user.id !== 'dev-user-id' ? req.user.id : undefined;

      // Verify organization exists and has active credentials
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          integrationCredentials: {
            where: { status: 'active' },
          },
          dataSources: {
            where: { isActive: true },
          },
        },
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: `Organization with ID ${organizationId} not found`,
        });
      }

      if (!org.integrationCredentials.length) {
        return res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'Organization does not have active integration credentials. Please configure your ShelterLuv API key first.',
        });
      }

      if (!org.dataSources.length) {
        return res.status(400).json({
          success: false,
          error: 'Bad request',
          message: 'Organization does not have any active data sources. Please configure your integration first.',
        });
      }

      // Schedule sync job for each active data source
      const scheduledJobs = [];
      for (const dataSource of org.dataSources) {
        const jobId = await scheduleSync(organizationId, dataSource.id, 'manual', userId);
        scheduledJobs.push({ dataSourceId: dataSource.id, jobId });
      }

      res.json({
        success: true,
        message: `Sync job${scheduledJobs.length > 1 ? 's' : ''} scheduled`,
        organizationId,
        scheduledJobs,
      });
    } catch (error) {
      console.error('Error scheduling sync:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to schedule sync',
      });
    }
  }
);

/**
 * GET /sync/:organizationId/status
 * Get sync status for an organization
 */
router.get(
  '/:organizationId/status',
  authenticate,
  requireRole('super_admin', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { organizationId } = req.params;

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          integrationCredentials: {
            where: { status: 'active' },
          },
          dataSources: {
            where: { isActive: true },
          },
          syncRuns: {
            take: 5,
            orderBy: { startedAt: 'desc' },
          },
          _count: {
            select: { animals: true },
          },
        },
      });

      if (!org) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: `Organization with ID ${organizationId} not found`,
        });
      }

      // Get the most recent sync state
      const syncState = await prisma.syncState.findFirst({
        where: { orgId: organizationId },
        orderBy: { lastSyncedAt: 'desc' },
      });

      const lastSync = org.syncRuns[0];

      res.json({
        success: true,
        status: {
          organizationId,
          hasCredentials: org.integrationCredentials.length > 0,
          hasDataSources: org.dataSources.length > 0,
          lastSyncAt: lastSync?.finishedAt || lastSync?.startedAt,
          lastSyncStatus: lastSync?.status,
          nextSyncAt: syncState?.nextEligibleAt,
          animalsCount: org._count.animals,
          recentSyncs: org.syncRuns.map(run => ({
            id: run.id,
            status: run.status,
            trigger: run.trigger,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            itemsFetched: run.itemsFetched,
            itemsUpserted: run.itemsUpserted,
            itemsDeleted: run.itemsDeleted,
            error: run.error,
          })),
        },
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch sync status',
      });
    }
  }
);

/**
 * GET /sync/:organizationId/history
 * Get sync history for an organization
 */
router.get(
  '/:organizationId/history',
  authenticate,
  requireRole('super_admin', 'admin', 'owner'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { organizationId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const [syncRuns, total] = await Promise.all([
        prisma.syncRun.findMany({
          where: { orgId: organizationId },
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            dataSource: {
              select: { name: true, provider: true },
            },
            createdBy: {
              select: { name: true, email: true },
            },
          },
        }),
        prisma.syncRun.count({ where: { orgId: organizationId } }),
      ]);

      res.json({
        success: true,
        data: syncRuns,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + syncRuns.length < total,
        },
      });
    } catch (error) {
      console.error('Error fetching sync history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch sync history',
      });
    }
  }
);

export default router;
