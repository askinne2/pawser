import { prisma } from '@pawser/database';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import FilterSidebar from './FilterSidebar';

export const dynamic = 'force-dynamic';

// Types
interface Animal {
  id: string;
  slug: string;
  name: string;
  species: string;
  breedPrimary: string | null;
  breedSecondary: string | null;
  ageYears: number | null;
  ageMonths: number | null;
  sex: string | null;
  size: string | null;
  status: string;
  attributes: Record<string, unknown> | null;
  mediaAssets: Array<{ url: string; isPrimary: boolean }>;
}

interface SearchParams {
  species?: string;
  sex?: string;
  size?: string;
  breed?: string;
  color?: string;
  goodWithDogs?: string;
  goodWithCats?: string;
  goodWithKids?: string;
  specialNeeds?: string;
  q?: string;
  sort?: string;
  page?: string;
}

// Resolve tenant from URL param or hostname
async function resolveTenant(domain: string) {
  // Domain param is the slug from URL path like /demo-shelter/animals
  const org = await prisma.organization.findUnique({
    where: { slug: domain },
    select: { id: true, name: true, slug: true, primaryColor: true, status: true },
  });
  return org && org.status === 'active' ? org : null;
}

// Generate page metadata
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { domain: string };
  searchParams: SearchParams;
}): Promise<Metadata> {
  // Use the domain param from URL path (e.g., /demo-shelter/animals)
  const tenant = await resolveTenant(params.domain);

  if (!tenant) {
    return { title: 'Not Found' };
  }

  const species = searchParams.species
    ? searchParams.species.charAt(0).toUpperCase() + searchParams.species.slice(1) + 's'
    : 'Animals';

  return {
    title: `Adoptable ${species}`,
    description: `Browse adoptable ${species.toLowerCase()} at ${tenant.name}. Find your perfect companion today!`,
    openGraph: {
      title: `Adoptable ${species} | ${tenant.name}`,
      description: `Find your perfect ${searchParams.species || 'pet'} at ${tenant.name}`,
      type: 'website',
    },
  };
}

// Helper to format age
function formatAge(years: number | null, months: number | null): string {
  if (years && years > 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }
  if (months && months > 0) {
    return months === 1 ? '1 month' : `${months} months`;
  }
  return 'Unknown';
}

// Get primary photo URL
function getPrimaryPhoto(mediaAssets: Animal['mediaAssets']): string | null {
  const primary = mediaAssets.find((m) => m.isPrimary);
  return primary?.url || mediaAssets[0]?.url || null;
}

export default async function AnimalsPage({
  params,
  searchParams,
}: {
  params: { domain: string };
  searchParams: SearchParams;
}) {
  // Use the domain param from URL path (e.g., /demo-shelter/animals)
  const tenant = await resolveTenant(params.domain);

  if (!tenant) {
    notFound();
  }

  // Parse pagination
  const page = parseInt(searchParams.page || '1', 10);
  const perPage = 24;
  const skip = (page - 1) * perPage;

  // Build filters
  const where: Record<string, unknown> = {
    orgId: tenant.id,
    published: true,
    status: 'available',
    deletedAt: null,
  };

  if (searchParams.species) {
    where.species = searchParams.species.toLowerCase();
  }
  if (searchParams.sex) {
    where.sex = searchParams.sex.toLowerCase();
  }
  if (searchParams.size) {
    where.size = searchParams.size.toLowerCase();
  }
  if (searchParams.breed) {
    where.breedPrimary = searchParams.breed;
  }
  if (searchParams.q) {
    where.OR = [
      { name: { contains: searchParams.q, mode: 'insensitive' } },
      { externalId: { contains: searchParams.q, mode: 'insensitive' } },
    ];
  }
  // JSON attribute filters
  if (searchParams.goodWithDogs === 'true') {
    where.attributes = { path: ['goodWithDogs'], equals: true };
  }
  if (searchParams.goodWithCats === 'true') {
    where.attributes = { path: ['goodWithCats'], equals: true };
  }
  if (searchParams.goodWithKids === 'true') {
    where.attributes = { path: ['goodWithKids'], equals: true };
  }
  if (searchParams.specialNeeds === 'true') {
    where.attributes = { path: ['specialNeeds'], equals: true };
  }

  // Build sort order
  let orderBy: Record<string, string> = { createdAt: 'desc' };
  if (searchParams.sort) {
    const [field, dir] = searchParams.sort.split('_');
    if (['name', 'createdAt', 'ageYears'].includes(field)) {
      orderBy = { [field]: dir === 'asc' ? 'asc' : 'desc' };
    }
  }

  // Base where clause for facets (without user filters)
  const baseWhere = {
    orgId: tenant.id,
    published: true,
    status: 'available',
    deletedAt: null,
  };

  // Fetch animals with count and facets
  const [animals, totalCount, allAnimals] = await Promise.all([
    prisma.animal.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
      select: {
        id: true,
        slug: true,
        name: true,
        species: true,
        breedPrimary: true,
        breedSecondary: true,
        ageYears: true,
        ageMonths: true,
        sex: true,
        size: true,
        status: true,
        attributes: true,
        mediaAssets: {
          select: { url: true, isPrimary: true },
          orderBy: { orderIndex: 'asc' },
          take: 1,
        },
      },
    }),
    prisma.animal.count({ where }),
    // Get all animals for facet counts
    prisma.animal.findMany({
      where: baseWhere,
      select: {
        species: true,
        sex: true,
        size: true,
        breedPrimary: true,
        color: true,
        attributes: true,
      },
    }),
  ]);

  // Calculate facets from all available animals
  const facets = {
    species: {} as Record<string, number>,
    goodWithDogs: 0,
    goodWithCats: 0,
    goodWithKids: 0,
    specialNeeds: 0,
  };

  const uniqueBreeds = new Set<string>();
  const uniqueColors = new Set<string>();
  const uniqueSpecies = new Set<string>();
  const uniqueSex = new Set<string>();
  const uniqueSize = new Set<string>();

  allAnimals.forEach((animal: any) => {
    // Species counts
    if (animal.species) {
      facets.species[animal.species] = (facets.species[animal.species] || 0) + 1;
      uniqueSpecies.add(animal.species);
    }
    
    // Collect unique values
    if (animal.sex) uniqueSex.add(animal.sex);
    if (animal.size) uniqueSize.add(animal.size);
    if (animal.breedPrimary) uniqueBreeds.add(animal.breedPrimary);
    if (animal.color) uniqueColors.add(animal.color);

    // Attribute counts
    const attrs = animal.attributes as Record<string, boolean> | null;
    if (attrs?.goodWithDogs) facets.goodWithDogs++;
    if (attrs?.goodWithCats) facets.goodWithCats++;
    if (attrs?.goodWithKids) facets.goodWithKids++;
    if (attrs?.specialNeeds) facets.specialNeeds++;
  });

  const filterOptions = {
    species: Array.from(uniqueSpecies),
    sex: Array.from(uniqueSex) as (string | null)[],
    size: Array.from(uniqueSize) as (string | null)[],
    breeds: Array.from(uniqueBreeds).sort(),
    colors: Array.from(uniqueColors).sort(),
  };

  // Pagination info
  const totalPages = Math.ceil(totalCount / perPage);

  // Build query string helper
  const buildQuery = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...searchParams, ...updates };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== '' && k !== 'page') params.set(k, v);
    });
    if (updates.page && updates.page !== '1') params.set('page', updates.page);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const primaryColor = tenant.primaryColor || '#3b82f6';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Adoptable Animals
          </h1>
          <p className="text-slate-600">
            {totalCount} {totalCount === 1 ? 'animal' : 'animals'} available for adoption
          </p>
        </div>

        {/* Desktop Layout: Sidebar + Grid */}
        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <FilterSidebar
            domain={params.domain}
            filterOptions={filterOptions}
            facets={facets}
            primaryColor={primaryColor}
            totalCount={totalCount}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Animal Grid */}
            {animals.length === 0 ? (
              <div className="text-center py-16 px-8 bg-white rounded-xl border border-slate-200">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-slate-600 text-lg mb-4">
                  No animals match your filters.
                </p>
                <p className="text-slate-500 text-sm">
                  Try adjusting your search criteria or clearing some filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {animals.map((animal: Animal) => {
                  const attrs = animal.attributes as Record<string, boolean> | null;
                  return (
                    <Link
                      key={animal.id}
                      href={`/${params.domain}/animals/${animal.slug}`}
                      className="block bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group"
                    >
                      {/* Photo */}
                      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                        {getPrimaryPhoto(animal.mediaAssets) ? (
                          <img
                            src={getPrimaryPhoto(animal.mediaAssets)!}
                            alt={animal.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-5xl opacity-30">
                              {animal.species === 'dog' ? '🐕' : animal.species === 'cat' ? '🐈' : '🐾'}
                            </span>
                          </div>
                        )}
                        
                        {/* Attribute badges */}
                        {(attrs?.goodWithKids || attrs?.goodWithDogs || attrs?.goodWithCats) && (
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            {attrs?.goodWithKids && (
                              <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs">👶</span>
                            )}
                            {attrs?.goodWithDogs && (
                              <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs">🐕</span>
                            )}
                            {attrs?.goodWithCats && (
                              <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs">🐱</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <h2 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {animal.name}
                        </h2>
                        <p className="text-slate-600 text-sm mt-0.5">
                          {animal.breedPrimary || animal.species}
                          {animal.breedSecondary && ` / ${animal.breedSecondary}`}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                          <span>{formatAge(animal.ageYears, animal.ageMonths)}</span>
                          {animal.sex && (
                            <>
                              <span>•</span>
                              <span>{animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)}</span>
                            </>
                          )}
                          {animal.size && (
                            <>
                              <span>•</span>
                              <span>{animal.size.charAt(0).toUpperCase() + animal.size.slice(1)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/${params.domain}/animals${buildQuery({ page: String(page - 1) })}`}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    ← Previous
                  </Link>
                )}

                <span
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  Page {page} of {totalPages}
                </span>

                {page < totalPages && (
                  <Link
                    href={`/${params.domain}/animals${buildQuery({ page: String(page + 1) })}`}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Next →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
