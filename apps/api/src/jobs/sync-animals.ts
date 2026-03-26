import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '@pawser/database';
import { ShelterLuvService } from '../services/ShelterLuvService';
import { decrypt } from '../utils/encryption';
import { ShelterLuvAnimal, AnimalStatus, AnimalSex, AnimalSize, AnimalSpecies } from '@pawser/shared';

/**
 * Sync job payload
 */
interface SyncJobData {
  orgId: string;
  dataSourceId: string;
  trigger: 'scheduled' | 'manual' | 'webhook';
  userId?: string;
  incremental?: boolean;
}

/**
 * Sync result metrics
 */
interface SyncResult {
  success: boolean;
  orgId: string;
  dataSourceId: string;
  itemsFetched: number;
  itemsUpserted: number;
  itemsDeleted: number;
  error?: string;
  duration: number;
}

/**
 * BullMQ queue for animal sync jobs
 */
export const syncQueue = new Queue<SyncJobData>('animal-sync', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
    },
  },
});

/**
 * Schedule a sync job for a specific data source
 */
export async function scheduleSync(
  orgId: string,
  dataSourceId: string,
  trigger: 'scheduled' | 'manual' | 'webhook' = 'manual',
  userId?: string
): Promise<string> {
  const job = await syncQueue.add(
    'sync-animals',
    { orgId, dataSourceId, trigger, userId },
    {
      jobId: `sync-${dataSourceId}-${Date.now()}`,
    }
  );
  return job.id || '';
}

/**
 * Check if sync is allowed based on tier rate limits
 * Manual syncs bypass rate limits, scheduled syncs respect them
 */
async function checkSyncEligibility(
  orgId: string,
  dataSourceId: string,
  trigger: 'scheduled' | 'manual' | 'webhook'
): Promise<{ eligible: boolean; reason?: string; nextEligibleAt?: Date }> {
  // Get current subscription and plan
  const subscription = await prisma.subscription.findFirst({
    where: { orgId, status: { in: ['active', 'trialing'] } },
    include: { plan: true },
  });

  if (!subscription) {
    return { eligible: false, reason: 'No active subscription' };
  }

  // Manual syncs bypass rate limits
  if (trigger === 'manual') {
    const syncIntervalSeconds = subscription.plan.syncIntervalSeconds;
    const nextEligibleAt = new Date(Date.now() + syncIntervalSeconds * 1000);
    return { eligible: true, nextEligibleAt };
  }

  // Scheduled syncs respect rate limits
  const syncIntervalSeconds = subscription.plan.syncIntervalSeconds;

  // Get sync state
  const syncState = await prisma.syncState.findFirst({
    where: { orgId, dataSourceId, resource: 'animals' },
  });

  if (syncState?.nextEligibleAt && syncState.nextEligibleAt > new Date()) {
    return {
      eligible: false,
      reason: `Rate limited. Next sync eligible at ${syncState.nextEligibleAt.toISOString()}`,
      nextEligibleAt: syncState.nextEligibleAt,
    };
  }

  // Calculate next eligible time
  const nextEligibleAt = new Date(Date.now() + syncIntervalSeconds * 1000);

  return { eligible: true, nextEligibleAt };
}

/**
 * Map ShelterLuv species to canonical species
 */
function mapSpecies(shelterLuvSpecies: string): AnimalSpecies {
  const lower = shelterLuvSpecies?.toLowerCase() || '';
  if (lower.includes('dog') || lower.includes('canine')) return 'dog';
  if (lower.includes('cat') || lower.includes('feline')) return 'cat';
  if (lower.includes('bird') || lower.includes('avian')) return 'bird';
  if (lower.includes('rabbit') || lower.includes('bunny')) return 'rabbit';
  return 'other';
}

/**
 * Map ShelterLuv status to canonical status
 */
function mapStatus(shelterLuvStatus: string): AnimalStatus {
  const lower = shelterLuvStatus?.toLowerCase() || '';
  if (lower.includes('available') || lower.includes('publishable')) return 'available';
  if (lower.includes('pending')) return 'pending';
  if (lower.includes('adopted')) return 'adopted';
  if (lower.includes('foster')) return 'foster';
  if (lower.includes('hold')) return 'hold';
  return 'available';
}

/**
 * Map ShelterLuv sex to canonical sex
 */
function mapSex(shelterLuvSex: string): AnimalSex {
  const lower = shelterLuvSex?.toLowerCase() || '';
  if (lower === 'male' || lower === 'm') return 'male';
  if (lower === 'female' || lower === 'f') return 'female';
  return 'unknown';
}

/**
 * Map ShelterLuv size to canonical size
 */
function mapSize(shelterLuvSize: string): AnimalSize | null {
  const lower = shelterLuvSize?.toLowerCase() || '';
  if (lower.includes('small') || lower.includes('tiny')) return 'small';
  if (lower.includes('medium') || lower.includes('med')) return 'medium';
  if (lower.includes('large') || lower.includes('big')) return 'large';
  if (lower.includes('xlarge') || lower.includes('extra large') || lower.includes('xl')) return 'xlarge';
  return null;
}

/**
 * Generate a URL-friendly slug from animal name and ID
 */
function generateSlug(name: string, externalId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${base}-${externalId.slice(-8)}`;
}

/**
 * Transform ShelterLuv animal to canonical Animal format
 */
function transformAnimal(
  slAnimal: ShelterLuvAnimal,
  orgId: string,
  dataSourceId: string
): {
  externalId: string;
  name: string;
  slug: string;
  species: AnimalSpecies;
  breedPrimary: string | null;
  breedSecondary: string | null;
  ageYears: number | null;
  ageMonths: number | null;
  sex: AnimalSex | null;
  size: AnimalSize | null;
  color: string | null;
  status: AnimalStatus;
  description: string | null;
  attributes: object;
  published: boolean;
  publishedAt: Date | null;
  intakeDate: Date | null;
  birthDate: Date | null;
  adoptionUrl: string | null;
  lastSeenAt: Date;
  photos: string[];
} {
  const externalId = slAnimal.ID || slAnimal.InternalID;
  const name = slAnimal.Name || 'Unknown';

  // Parse age from string like "2 years" or "6 months" or number
  let ageYears: number | null = null;
  let ageMonths: number | null = null;
  if (slAnimal.Age !== undefined && slAnimal.Age !== null) {
    const ageStr = String(slAnimal.Age);
    const yearMatch = ageStr.match(/(\d+)\s*year/i);
    const monthMatch = ageStr.match(/(\d+)\s*month/i);
    if (yearMatch) ageYears = parseInt(yearMatch[1]);
    if (monthMatch) ageMonths = parseInt(monthMatch[1]);
    
    // If Age is just a number, treat it as years
    if (!yearMatch && !monthMatch && /^\d+$/.test(ageStr)) {
      ageYears = parseInt(ageStr);
    }
  }

  // Parse dates
  let intakeDate: Date | null = null;
  if (slAnimal.LastIntakeUnixTime) {
    intakeDate = new Date(slAnimal.LastIntakeUnixTime * 1000);
  }

  let birthDate: Date | null = null;
  if (slAnimal.DOBUnixTime) {
    birthDate = new Date(slAnimal.DOBUnixTime * 1000);
  }

  // Extract photos
  const photos: string[] = [];
  if (slAnimal.Photos && Array.isArray(slAnimal.Photos)) {
    photos.push(...slAnimal.Photos.map((p: { URL?: string } | string) => typeof p === 'string' ? p : p.URL || '').filter(Boolean));
  }
  if (slAnimal.Photo && !photos.includes(slAnimal.Photo)) {
    photos.unshift(slAnimal.Photo);
  }

  // Build attributes object
  const attributes: Record<string, boolean> = {};
  if (slAnimal.Attributes) {
    for (const [key, value] of Object.entries(slAnimal.Attributes)) {
      if (typeof value === 'boolean' || value === 'Yes' || value === 'No') {
        attributes[key] = value === true || value === 'Yes';
      }
    }
  }

  // Status handling
  const isPublished = slAnimal.Status === 'Available' || 
                      slAnimal.StatusType === 'publishable' ||
                      slAnimal.Status === 'Publishable';

  return {
    externalId,
    name,
    slug: generateSlug(name, externalId),
    species: mapSpecies(slAnimal.Type || slAnimal.Species || ''),
    breedPrimary: slAnimal.Breed || slAnimal.PrimaryBreed || null,
    breedSecondary: slAnimal.SecondaryBreed || null,
    ageYears,
    ageMonths,
    sex: mapSex(slAnimal.Sex || ''),
    size: mapSize(slAnimal.Size || ''),
    color: slAnimal.Color || slAnimal.Coloring || null,
    status: mapStatus(slAnimal.Status || 'available'),
    description: slAnimal.Description || slAnimal.LongDescription || null,
    attributes,
    published: isPublished,
    publishedAt: isPublished ? new Date() : null,
    intakeDate,
    birthDate,
    adoptionUrl: slAnimal.AdoptionUrl || slAnimal.ExternalUrl || null,
    lastSeenAt: new Date(),
    photos,
  };
}

/**
 * Sync worker to process animal sync jobs
 */
export const syncWorker = new Worker<SyncJobData>(
  'animal-sync',
  async (job: Job<SyncJobData>): Promise<SyncResult> => {
    const { orgId, dataSourceId, trigger, userId, incremental } = job.data;
    const startTime = Date.now();

    console.log(`Starting ${incremental ? 'incremental' : 'full'} sync for org: ${orgId}, dataSource: ${dataSourceId}`);

    // Create sync run record (userId is optional - only set if valid)
    const syncRun = await prisma.syncRun.create({
      data: {
        orgId,
        dataSourceId,
        trigger,
        ...(userId ? { createdByUserId: userId } : {}),
        status: 'running',
      },
    });

    let itemsFetched = 0;
    let itemsUpserted = 0;
    let itemsDeleted = 0;

    try {
      // Check tier eligibility (manual syncs bypass rate limits)
      const eligibility = await checkSyncEligibility(orgId, dataSourceId, trigger);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Get data source with credentials
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId },
        include: { credentials: true },
      });

      if (!dataSource) {
        throw new Error(`DataSource ${dataSourceId} not found`);
      }

      if (!dataSource.isActive) {
        throw new Error(`DataSource ${dataSourceId} is not active`);
      }

      if (!dataSource.credentials || dataSource.credentials.status !== 'active') {
        throw new Error(`DataSource ${dataSourceId} does not have active credentials`);
      }

      // Decrypt API key
      const apiKey = decrypt(
        dataSource.credentials.secretCiphertext,
        dataSource.credentials.secretIv,
        dataSource.credentials.secretTag
      );

      // Create ShelterLuv service
      const shelterLuvService = new ShelterLuvService(apiKey, dataSource.externalAccountId || undefined);

      // Get sync state for incremental sync
      let syncState = await prisma.syncState.findUnique({
        where: {
          orgId_dataSourceId_resource: {
            orgId,
            dataSourceId,
            resource: 'animals',
          },
        },
      });

      // Fetch animals from ShelterLuv API
      const allAnimals: ShelterLuvAnimal[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      // For incremental sync, we could use a modified_since parameter if the API supports it
      // For now, we do a full fetch but only upsert changed records

      while (hasMore) {
        job.updateProgress(Math.min(page * 10, 50));

        // Fetch publishable animals from API (ShelterLuv API only supports status_type, not status)
        const animals = await shelterLuvService.getAnimals({
          page,
          limit,
          status_type: 'publishable',
        });

        if (animals.length === 0) {
          hasMore = false;
        } else {
          // Filter to only currently available animals (not historical publishable ones)
          // ShelterLuv returns Status like "Available For Adoption", "Awaiting Vet Exam / Health Check", etc.
          // Default: include animals with "Available" in their Status
          const availableStatuses = [
            'Available For Adoption',
            'Available for Adoption', // Case variation
          ];
          
          const availableAnimals = (animals as unknown as ShelterLuvAnimal[]).filter(
            (animal) => availableStatuses.some(status => 
              animal.Status?.toLowerCase() === status.toLowerCase()
            )
          );
          
          allAnimals.push(...availableAnimals);
          
          // Log filtering on first page
          if (page === 1) {
            console.log(`Filtering: ${availableAnimals.length} of ${animals.length} animals match 'Available For Adoption' status`);
          }
          
          page++;

          // Stop if we got an empty page from the API (no more results)
          if (animals.length === 0) {
            hasMore = false;
          }
          
          // Safety limit: prevent infinite loops
          const maxPages = 100;
          if (page > maxPages) {
            console.warn(`Reached max pages limit (${maxPages}) for org ${orgId}`);
            hasMore = false;
          }
        }
      }

      itemsFetched = allAnimals.length;
      console.log(`Fetched ${itemsFetched} animals for org ${orgId}`);

      job.updateProgress(60);

      // Track seen external IDs for deletion detection
      const seenExternalIds = new Set<string>();

      // Upsert animals in batches
      const batchSize = 50;
      for (let i = 0; i < allAnimals.length; i += batchSize) {
        const batch = allAnimals.slice(i, i + batchSize);

        for (const slAnimal of batch) {
          const transformed = transformAnimal(slAnimal, orgId, dataSourceId);
          // Since we're fetching with status_type: 'publishable', all animals should be published and available
          transformed.published = true;
          transformed.publishedAt = transformed.publishedAt || new Date();
          transformed.status = 'available'; // Ensure status is 'available' for publishable animals
          seenExternalIds.add(transformed.externalId);

          // Upsert animal
          const animal = await prisma.animal.upsert({
            where: {
              orgId_dataSourceId_externalId: {
                orgId,
                dataSourceId,
                externalId: transformed.externalId,
              },
            },
            create: {
              orgId,
              dataSourceId,
              ...transformed,
              photos: undefined, // Photos handled separately
            },
            update: {
              name: transformed.name,
              slug: transformed.slug,
              species: transformed.species,
              breedPrimary: transformed.breedPrimary,
              breedSecondary: transformed.breedSecondary,
              ageYears: transformed.ageYears,
              ageMonths: transformed.ageMonths,
              sex: transformed.sex,
              size: transformed.size,
              color: transformed.color,
              status: transformed.status,
              description: transformed.description,
              attributes: transformed.attributes,
              published: transformed.published,
              publishedAt: transformed.publishedAt,
              intakeDate: transformed.intakeDate,
              birthDate: transformed.birthDate,
              adoptionUrl: transformed.adoptionUrl,
              lastSeenAt: transformed.lastSeenAt,
              deletedAt: null, // Un-delete if previously deleted
            },
          });

          // Handle media assets (photos)
          // Delete existing photos and re-create (simple approach)
          if (transformed.photos.length > 0) {
            await prisma.mediaAsset.deleteMany({
              where: { animalId: animal.id },
            });

            await prisma.mediaAsset.createMany({
              data: transformed.photos.map((url, index) => ({
                orgId,
                animalId: animal.id,
                url,
                isPrimary: index === 0,
                orderIndex: index,
              })),
            });
          }

          itemsUpserted++;
        }

        // Update progress
        const progress = 60 + Math.floor((i / allAnimals.length) * 35);
        job.updateProgress(progress);
      }

      // Soft-delete animals that weren't seen in this sync
      // Only delete if we actually fetched animals (avoid deleting everything on first sync)
      if (seenExternalIds.size > 0) {
        const deleteResult = await prisma.animal.updateMany({
          where: {
            orgId,
            dataSourceId,
            externalId: { notIn: Array.from(seenExternalIds) },
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
            published: false,
          },
        });
        itemsDeleted = deleteResult.count;
        console.log(`Soft-deleted ${itemsDeleted} animals that are no longer available for org ${orgId}`);
      }

      job.updateProgress(98);

      // Update sync state
      await prisma.syncState.upsert({
        where: {
          orgId_dataSourceId_resource: {
            orgId,
            dataSourceId,
            resource: 'animals',
          },
        },
        create: {
          orgId,
          dataSourceId,
          resource: 'animals',
          lastSyncedAt: new Date(),
          nextEligibleAt: eligibility.nextEligibleAt,
          cursor: { lastSeenIds: Array.from(seenExternalIds).slice(0, 100) },
        },
        update: {
          lastSyncedAt: new Date(),
          nextEligibleAt: eligibility.nextEligibleAt,
          cursor: { lastSeenIds: Array.from(seenExternalIds).slice(0, 100) },
          backoffSeconds: 0,
        },
      });

      // Update sync run as completed
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'completed',
          finishedAt: new Date(),
          itemsFetched,
          itemsUpserted,
          itemsDeleted,
        },
      });

      job.updateProgress(100);

      const duration = Date.now() - startTime;
      console.log(`Sync completed for org ${orgId}: ${itemsUpserted} upserted, ${itemsDeleted} deleted in ${duration}ms`);

      return {
        success: true,
        orgId,
        dataSourceId,
        itemsFetched,
        itemsUpserted,
        itemsDeleted,
        duration,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Sync failed for org ${orgId}:`, errorMessage);

      // Update sync run as failed
      await prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: errorMessage,
          itemsFetched,
          itemsUpserted,
          itemsDeleted,
        },
      });

      // Update sync state with backoff
      await prisma.syncState.upsert({
        where: {
          orgId_dataSourceId_resource: {
            orgId,
            dataSourceId,
            resource: 'animals',
          },
        },
        create: {
          orgId,
          dataSourceId,
          resource: 'animals',
          backoffSeconds: 60,
          nextEligibleAt: new Date(Date.now() + 60 * 1000),
        },
        update: {
          backoffSeconds: { multiply: 2 }, // Exponential backoff
          nextEligibleAt: new Date(Date.now() + 60 * 1000),
        },
      });

      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 5, // Process up to 5 sync jobs concurrently
  }
);

// Worker event handlers
syncWorker.on('completed', (job, result: SyncResult) => {
  console.log(`Sync job ${job.id} completed: ${result.itemsUpserted} animals synced in ${result.duration}ms`);
});

syncWorker.on('failed', (job, err) => {
  console.error(`Sync job ${job?.id} failed:`, err.message);
});

syncWorker.on('error', (err) => {
  console.error('Sync worker error:', err);
});

// Start worker if this file is run directly
if (require.main === module) {
  console.log('Sync worker started');
}
