import { Router, Response } from 'express';
import { prisma } from '@pawser/database';
import { TenantRequest, resolveTenant } from '../middleware/tenant';
import { requireTenant } from '../middleware/tenantGuard';
import { rateLimit } from '../middleware/rateLimit';
import { cacheService } from '../services/CacheService';
import { AnimalParams, AnimalStatus, AnimalSpecies, AnimalSex, AnimalSize } from '@pawser/shared';

const router = Router();

// Default pagination per PRD-01
const DEFAULT_PER_PAGE = 24;
const MAX_PER_PAGE = 100;

/**
 * Build Prisma where clause from query params
 * Supports filters per PRD-01: species, age, size, sex, color, breed, good-with, special-needs, name search
 */
function buildWhereClause(orgId: string, params: AnimalParams) {
  const where: Record<string, unknown> = {
    orgId,
    published: true,
    deletedAt: null,
  };

  // Status filter (default: available)
  if (params.status) {
    where.status = params.status;
  } else {
    where.status = 'available';
  }

  // Species filter
  if (params.species) {
    where.species = params.species.toLowerCase();
  }

  // Sex filter
  if (params.sex) {
    where.sex = params.sex.toLowerCase();
  }

  // Size filter
  if (params.size) {
    where.size = params.size.toLowerCase();
  }

  // Color filter
  if (params.color) {
    where.color = { contains: params.color, mode: 'insensitive' };
  }

  // Breed filter (searches both primary and secondary)
  if (params.breed) {
    where.OR = [
      { breedPrimary: { contains: params.breed, mode: 'insensitive' } },
      { breedSecondary: { contains: params.breed, mode: 'insensitive' } },
    ];
  }

  // Location filter
  if (params.locationId) {
    where.locationId = params.locationId;
  }

  // Name/ID search with debounce-friendly approach
  if (params.search || params.name) {
    const searchTerm = params.search || params.name;
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { externalId: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  // Good-with filters (stored in attributes JSONB)
  if (params.goodWithKids === true) {
    where.attributes = { path: ['goodWithKids'], equals: true };
  }
  if (params.goodWithDogs === true) {
    where.attributes = { path: ['goodWithDogs'], equals: true };
  }
  if (params.goodWithCats === true) {
    where.attributes = { path: ['goodWithCats'], equals: true };
  }
  if (params.specialNeeds === true) {
    where.attributes = { path: ['specialNeeds'], equals: true };
  }

  return where;
}

/**
 * Build Prisma orderBy from sort params
 * PRD-01: Newest, Longest stay, Name A-Z, Distance (when location provided)
 */
function buildOrderBy(params: AnimalParams) {
  const sortBy = params.sort || params.sortBy || params.sort_by || 'newest';
  const sortDir = params.sortDir || params.sort_dir || 'desc';

  switch (sortBy.toLowerCase()) {
    case 'newest':
    case 'createdat_desc':
      return { createdAt: 'desc' as const };
    case 'oldest':
    case 'createdat_asc':
    case 'longest_stay':
      return { intakeDate: 'asc' as const }; // Oldest intake = longest stay
    case 'name_asc':
    case 'name':
      return { name: 'asc' as const };
    case 'name_desc':
      return { name: 'desc' as const };
    case 'updatedat_desc':
      return { updatedAt: 'desc' as const };
    default:
      return { createdAt: sortDir as 'asc' | 'desc' };
  }
}

/**
 * GET /animals
 * Get all animals for the current tenant with filtering, pagination, sorting
 * Per PRD-01: 24 per page default, filters, sorting
 */
router.get(
  '/',
  resolveTenant,
  requireTenant,
  rateLimit,
  async (req: TenantRequest, res: Response) => {
    try {
      const orgId = req.tenant!.orgId || req.tenant!.tenantId;

      // Parse pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const perPage = Math.min(
        MAX_PER_PAGE,
        Math.max(1, parseInt(req.query.perPage as string || req.query.per_page as string || req.query.limit as string) || DEFAULT_PER_PAGE)
      );
      const skip = (page - 1) * perPage;

      // Build query params
      const params: AnimalParams = {
        species: req.query.species as string,
        status: req.query.status as string,
        sex: req.query.sex as string,
        size: req.query.size as string,
        color: req.query.color as string,
        breed: req.query.breed as string,
        search: req.query.search as string,
        name: req.query.name as string,
        locationId: req.query.locationId as string,
        sort: req.query.sort as string,
        sortBy: req.query.sortBy as string,
        sortDir: req.query.sortDir as 'asc' | 'desc',
        goodWithKids: req.query.goodWithKids === 'true',
        goodWithDogs: req.query.goodWithDogs === 'true',
        goodWithCats: req.query.goodWithCats === 'true',
        specialNeeds: req.query.specialNeeds === 'true',
      };

      // Build where clause and order
      const where = buildWhereClause(orgId, params);
      const orderBy = buildOrderBy(params);

      // Check cache for simple queries (no filters)
      const isSimpleQuery = !params.species && !params.search && !params.breed && page === 1;
      if (isSimpleQuery) {
        const cached = await cacheService.getAnimals(orgId);
        if (cached && cached.length > 0) {
          return res.json({
            success: true,
            animals: cached.slice(0, perPage),
            total: cached.length,
            page,
            perPage,
            totalPages: Math.ceil(cached.length / perPage),
            cached: true,
          });
        }
      }

      // Fetch from database with count
      const [animals, total] = await Promise.all([
        prisma.animal.findMany({
          where,
          orderBy,
          skip,
          take: perPage,
          include: {
            mediaAssets: {
              where: { isPrimary: true },
              take: 1,
              orderBy: { orderIndex: 'asc' },
            },
            location: {
              select: { id: true, name: true, city: true, state: true },
            },
          },
        }),
        prisma.animal.count({ where }),
      ]);

      // Transform to response format
      const response = animals.map((animal) => ({
        id: animal.id,
        slug: animal.slug,
        externalId: animal.externalId,
        name: animal.name,
        species: animal.species,
        breedPrimary: animal.breedPrimary,
        breedSecondary: animal.breedSecondary,
        ageYears: animal.ageYears,
        ageMonths: animal.ageMonths,
        sex: animal.sex,
        size: animal.size,
        color: animal.color,
        status: animal.status,
        description: animal.description,
        attributes: animal.attributes,
        published: animal.published,
        publishedAt: animal.publishedAt,
        adoptionUrl: animal.adoptionUrl,
        intakeDate: animal.intakeDate,
        createdAt: animal.createdAt,
        updatedAt: animal.updatedAt,
        // Primary photo
        photoUrl: animal.mediaAssets[0]?.url || null,
        // Location info (city/state only per PRD-01 privacy)
        location: animal.location
          ? {
              id: animal.location.id,
              name: animal.location.name,
              city: animal.location.city,
              state: animal.location.state,
            }
          : null,
      }));

      // Cache simple queries
      if (isSimpleQuery && response.length > 0) {
        await cacheService.setAnimals(orgId, response as any[], 300);
      }

      const totalPages = Math.ceil(total / perPage);

      res.json({
        success: true,
        animals: response,
        total,
        page,
        perPage,
        totalPages,
        cached: false,
      });
    } catch (error) {
      console.error('Error fetching animals:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch animals',
      });
    }
  }
);

/**
 * GET /animals/:id
 * Get a single animal by slug or ID
 * Per PRD-01: `/animals/[slug-id]` with full detail
 */
router.get(
  '/:id',
  resolveTenant,
  requireTenant,
  rateLimit,
  async (req: TenantRequest, res: Response) => {
    try {
      const orgId = req.tenant!.orgId || req.tenant!.tenantId;
      const { id } = req.params;

      // Check cache first
      const cached = await cacheService.getAnimal(orgId, id);
      if (cached) {
        return res.json({
          success: true,
          animal: cached,
          cached: true,
        });
      }

      // Try finding by slug first (preferred URL format per PRD-01)
      let animal = await prisma.animal.findFirst({
        where: {
          orgId,
          slug: id,
          published: true,
          deletedAt: null,
        },
        include: {
          mediaAssets: {
            orderBy: { orderIndex: 'asc' },
          },
          location: true,
          dataSource: {
            select: { id: true, name: true, provider: true },
          },
        },
      });

      // Fallback to ID or externalId
      if (!animal) {
        animal = await prisma.animal.findFirst({
          where: {
            orgId,
            OR: [
              { id },
              { externalId: id },
            ],
            published: true,
            deletedAt: null,
          },
          include: {
            mediaAssets: {
              orderBy: { orderIndex: 'asc' },
            },
            location: true,
            dataSource: {
              select: { id: true, name: true, provider: true },
            },
          },
        });
      }

      if (!animal) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: `Animal with ID or slug "${id}" not found`,
        });
      }

      // Transform response per PRD-01 detail requirements
      const response = {
        id: animal.id,
        slug: animal.slug,
        externalId: animal.externalId,
        name: animal.name,
        species: animal.species,
        breedPrimary: animal.breedPrimary,
        breedSecondary: animal.breedSecondary,
        ageYears: animal.ageYears,
        ageMonths: animal.ageMonths,
        sex: animal.sex,
        size: animal.size,
        color: animal.color,
        status: animal.status,
        description: animal.description,
        attributes: animal.attributes,
        published: animal.published,
        publishedAt: animal.publishedAt,
        intakeDate: animal.intakeDate,
        birthDate: animal.birthDate,
        adoptionUrl: animal.adoptionUrl,
        lastSeenAt: animal.lastSeenAt,
        createdAt: animal.createdAt,
        updatedAt: animal.updatedAt,
        // All photos with gallery support
        photos: animal.mediaAssets.map((m) => ({
          id: m.id,
          url: m.url,
          r2Key: m.r2Key,
          isPrimary: m.isPrimary,
          orderIndex: m.orderIndex,
          width: m.width,
          height: m.height,
        })),
        // Location (city/state only per PRD-01 privacy)
        location: animal.location
          ? {
              id: animal.location.id,
              name: animal.location.name,
              city: animal.location.city,
              state: animal.location.state,
            }
          : null,
      };

      // Cache the result
      await cacheService.setAnimal(orgId, id, response as any, 300);

      res.json({
        success: true,
        animal: response,
        cached: false,
      });
    } catch (error) {
      console.error('Error fetching animal:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch animal',
      });
    }
  }
);

/**
 * GET /animals/filters
 * Get available filter values for the current tenant
 * Returns facets with counts per PRD-01
 */
router.get(
  '/meta/filters',
  resolveTenant,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const orgId = req.tenant!.orgId || req.tenant!.tenantId;

      // Get distinct values for each filterable field
      const [speciesCounts, sexCounts, sizeCounts, statusCounts] = await Promise.all([
        prisma.animal.groupBy({
          by: ['species'],
          where: { orgId, published: true, deletedAt: null },
          _count: { species: true },
        }),
        prisma.animal.groupBy({
          by: ['sex'],
          where: { orgId, published: true, deletedAt: null, sex: { not: null } },
          _count: { sex: true },
        }),
        prisma.animal.groupBy({
          by: ['size'],
          where: { orgId, published: true, deletedAt: null, size: { not: null } },
          _count: { size: true },
        }),
        prisma.animal.groupBy({
          by: ['status'],
          where: { orgId, published: true, deletedAt: null },
          _count: { status: true },
        }),
      ]);

      res.json({
        success: true,
        filters: {
          species: speciesCounts.map((s) => ({ value: s.species, count: s._count.species })),
          sex: sexCounts.map((s) => ({ value: s.sex, count: s._count.sex })),
          size: sizeCounts.map((s) => ({ value: s.size, count: s._count.size })),
          status: statusCounts.map((s) => ({ value: s.status, count: s._count.status })),
        },
      });
    } catch (error) {
      console.error('Error fetching filters:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch filter options',
      });
    }
  }
);

export default router;
