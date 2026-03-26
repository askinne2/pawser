/**
 * Cleanup script to fix animals with incorrect status/published flags
 * 
 * Usage: pnpm --filter @pawser/database exec tsx ../../scripts/cleanup-animals.ts [orgId]
 * Or: cd packages/database && dotenv -e ../../.env -- tsx ../../scripts/cleanup-animals.ts [orgId]
 * 
 * If orgId is provided, only cleans that organization.
 * Otherwise, cleans all organizations.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAnimals(orgId?: string) {
  console.log('Starting animal cleanup...');
  
  const where: any = {
    published: true,
    status: { not: 'available' },
    deletedAt: null,
  };
  
  if (orgId) {
    where.orgId = orgId;
    console.log(`Cleaning up organization: ${orgId}`);
  } else {
    console.log('Cleaning up all organizations');
  }

  // Find animals that are published but not available
  const publishedButNotAvailable = await prisma.animal.findMany({
    where,
    select: { id: true, orgId: true, name: true, status: true },
  });

  console.log(`Found ${publishedButNotAvailable.length} animals that are published but not available`);

  if (publishedButNotAvailable.length > 0) {
    // Unpublish them
    const result = await prisma.animal.updateMany({
      where: {
        id: { in: publishedButNotAvailable.map(a => a.id) },
      },
      data: {
        published: false,
        publishedAt: null,
      },
    });

    console.log(`Unpublished ${result.count} animals`);
  }

  // Find animals that are available but not published
  const availableButNotPublished: any = {
    published: false,
    status: 'available',
    deletedAt: null,
  };
  
  if (orgId) {
    availableButNotPublished.orgId = orgId;
  }

  const availableButNotPublishedCount = await prisma.animal.count({
    where: availableButNotPublished,
  });

  console.log(`Found ${availableButNotPublishedCount} animals that are available but not published`);

  if (availableButNotPublishedCount > 0) {
    // Publish them
    const result = await prisma.animal.updateMany({
      where: availableButNotPublished,
      data: {
        published: true,
        publishedAt: new Date(),
      },
    });

    console.log(`Published ${result.count} animals`);
  }

  // Find animals with null status
  const nullStatus: any = {
    status: null,
    deletedAt: null,
  };
  
  if (orgId) {
    nullStatus.orgId = orgId;
  }

  const nullStatusCount = await prisma.animal.count({
    where: nullStatus,
  });

  console.log(`Found ${nullStatusCount} animals with null status`);

  if (nullStatusCount > 0) {
    // Set them to available and published (if they're in the system, they should be available)
    const result = await prisma.animal.updateMany({
      where: nullStatus,
      data: {
        status: 'available',
        published: true,
        publishedAt: new Date(),
      },
    });

    console.log(`Fixed ${result.count} animals with null status`);
  }

  console.log('Cleanup complete!');
}

// Run cleanup
const orgId = process.argv[2];

cleanupAnimals(orgId)
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
