import { scheduleSync } from './sync-animals';
import { prisma } from '@pawser/database';

/**
 * Schedule periodic syncs for all active organizations
 * Should be called on server startup and can be run as a cron job
 */
export async function scheduleAllSyncs(): Promise<void> {
  console.log('Scheduling syncs for all active organizations...');

  // Find organizations with active data sources and credentials
  const organizations = await prisma.organization.findMany({
    where: {
      status: 'active',
      dataSources: {
        some: { isActive: true },
      },
      integrationCredentials: {
        some: { status: 'active' },
      },
    },
    include: {
      subscriptions: {
        where: { status: 'active' },
        take: 1,
        include: { plan: true },
      },
      syncStates: {
        orderBy: { lastSyncedAt: 'desc' },
        take: 1,
      },
    },
  });

  for (const org of organizations) {
    const plan = org.subscriptions[0]?.plan;
    const syncInterval = plan?.syncIntervalSeconds || 3600; // Default 1 hour

    // Schedule initial sync
    await scheduleSync(org.id);

    console.log(
      `Scheduled sync for organization ${org.id} (${org.name}) - plan: ${plan?.name || 'trial'}, interval: ${syncInterval / 60}min`
    );
  }

  console.log(`Scheduled syncs for ${organizations.length} organizations`);
}

/**
 * Schedule periodic syncs using setInterval
 * This is a simple approach - in production, consider using BullMQ or similar
 */
export function startPeriodicSyncScheduler(): void {
  console.log('Starting periodic sync scheduler...');

  // Run every 5 minutes to check for organizations that need syncing
  setInterval(async () => {
    try {
      const now = new Date();

      // Find organizations where next sync is due
      const dueSyncs = await prisma.syncState.findMany({
        where: {
          OR: [
            { nextEligibleAt: null },
            { nextEligibleAt: { lte: now } },
          ],
        },
        include: {
          organization: {
            include: {
              integrationCredentials: {
                where: { status: 'active' },
              },
              dataSources: {
                where: { isActive: true },
              },
            },
          },
        },
      });

      for (const syncState of dueSyncs) {
        const org = syncState.organization;

        // Skip if org is not active or has no credentials
        if (org.status !== 'active') continue;
        if (!org.integrationCredentials.length) continue;
        if (!org.dataSources.length) continue;

        await scheduleSync(org.id);
        console.log(`Scheduled sync for organization ${org.id} (due at: ${syncState.nextEligibleAt})`);
      }

      // Also check for organizations that have never synced
      const neverSynced = await prisma.organization.findMany({
        where: {
          status: 'active',
          dataSources: {
            some: { isActive: true },
          },
          integrationCredentials: {
            some: { status: 'active' },
          },
          syncStates: {
            none: {},
          },
        },
      });

      for (const org of neverSynced) {
        await scheduleSync(org.id);
        console.log(`Scheduled initial sync for organization ${org.id} (${org.name})`);
      }
    } catch (error) {
      console.error('Error in periodic sync scheduler:', error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  console.log('Periodic sync scheduler started (checking every 5 minutes)');
}

// Start scheduler if this file is run directly
if (require.main === module) {
  startPeriodicSyncScheduler();
}
