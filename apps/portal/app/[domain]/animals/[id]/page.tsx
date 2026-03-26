import { prisma } from '@pawser/database';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Resolve tenant from URL path domain param
async function resolveTenant(domain: string) {
  const org = await prisma.organization.findUnique({
    where: { slug: domain },
    select: { id: true, name: true, slug: true, primaryColor: true, status: true },
  });
  return org && org.status === 'active' ? org : null;
}

// Get animal by slug or ID
async function getAnimal(orgId: string, slugOrId: string) {
  // Try slug first, then ID
  let animal = await prisma.animal.findFirst({
    where: {
      orgId,
      slug: slugOrId,
      published: true,
      deletedAt: null,
    },
    include: {
      mediaAssets: {
        orderBy: { orderIndex: 'asc' },
      },
      location: true,
    },
  });

  if (!animal) {
    // Try by ID
    animal = await prisma.animal.findFirst({
      where: {
        orgId,
        id: slugOrId,
        published: true,
        deletedAt: null,
      },
      include: {
        mediaAssets: {
          orderBy: { orderIndex: 'asc' },
        },
        location: true,
      },
    });
  }

  return animal;
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { domain: string; id: string };
}): Promise<Metadata> {
  // Use the domain param from URL path
  const tenant = await resolveTenant(params.domain);

  if (!tenant) {
    return { title: 'Not Found' };
  }

  const animal = await getAnimal(tenant.id, params.id);

  if (!animal) {
    return { title: 'Animal Not Found' };
  }

  const primaryPhoto = animal.mediaAssets.find((m) => m.isPrimary)?.url ||
    animal.mediaAssets[0]?.url;

  const breed = [animal.breedPrimary, animal.breedSecondary].filter(Boolean).join(' / ');
  const description = animal.description
    ? animal.description.slice(0, 160)
    : `Meet ${animal.name}, a ${formatAge(animal.ageYears, animal.ageMonths)} old ${breed || animal.species} looking for a forever home.`;

  return {
    title: `${animal.name} - Adoptable ${animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}`,
    description,
    openGraph: {
      title: `Adopt ${animal.name} | ${tenant.name}`,
      description,
      type: 'article',
      images: primaryPhoto
        ? [
            {
              url: primaryPhoto,
              width: 1200,
              height: 630,
              alt: `Photo of ${animal.name}`,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Adopt ${animal.name}`,
      description,
      images: primaryPhoto ? [primaryPhoto] : [],
    },
  };
}

// Helper to format age
function formatAge(years: number | null, months: number | null): string {
  const parts: string[] = [];
  if (years && years > 0) {
    parts.push(years === 1 ? '1 year' : `${years} years`);
  }
  if (months && months > 0) {
    parts.push(months === 1 ? '1 month' : `${months} months`);
  }
  return parts.length > 0 ? parts.join(', ') : 'Unknown age';
}

// Attribute display helper
function formatAttribute(key: string): string {
  const labels: Record<string, string> = {
    goodWithKids: 'Good with Kids',
    goodWithDogs: 'Good with Dogs',
    goodWithCats: 'Good with Cats',
    houseTrained: 'House Trained',
    spayedNeutered: 'Spayed/Neutered',
    vaccinated: 'Up to Date on Vaccines',
    microchipped: 'Microchipped',
    specialNeeds: 'Special Needs',
  };
  return labels[key] || key;
}

export default async function AnimalDetailPage({
  params,
}: {
  params: { domain: string; id: string };
}) {
  // Use the domain param from URL path
  const tenant = await resolveTenant(params.domain);

  if (!tenant) {
    notFound();
  }

  const animal = await getAnimal(tenant.id, params.id);

  if (!animal) {
    notFound();
  }

  const primaryColor = tenant.primaryColor || '#3b82f6';
  const photos = animal.mediaAssets.map((m) => m.url);
  const breed = [animal.breedPrimary, animal.breedSecondary].filter(Boolean).join(' / ');

  // Parse attributes
  const attributes = (animal.attributes as Record<string, boolean>) || {};
  const positiveAttributes = Object.entries(attributes)
    .filter(([_, value]) => value === true)
    .map(([key]) => key);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav style={{ marginBottom: '1.5rem' }}>
        <Link
          href={`/${params.domain}/animals`}
          style={{
            color: primaryColor,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>←</span>
          <span>Back to All Animals</span>
        </Link>
      </nav>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          marginBottom: '2rem',
        }}
      >
        {/* Photo Gallery */}
        <div>
          {/* Main Photo */}
          {photos.length > 0 ? (
            <div
              style={{
                aspectRatio: '4/3',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '1rem',
              }}
            >
              <img
                src={photos[0]}
                alt={`${animal.name} - Main photo`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                aspectRatio: '4/3',
                borderRadius: '12px',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '5rem', opacity: 0.3 }}>
                {animal.species === 'dog' ? '🐕' : animal.species === 'cat' ? '🐈' : '🐾'}
              </span>
            </div>
          )}

          {/* Thumbnail Gallery */}
          {photos.length > 1 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '0.5rem',
              }}
            >
              {photos.slice(1, 7).map((photo, index) => (
                <div
                  key={index}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={photo}
                    alt={`${animal.name} - Photo ${index + 2}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))}
              {photos.length > 7 && (
                <div
                  style={{
                    aspectRatio: '1',
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontWeight: '500',
                  }}
                >
                  +{photos.length - 7}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Animal Info */}
        <div>
          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#111827',
            }}
          >
            {animal.name}
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
            }}
          >
            {breed || animal.species.charAt(0).toUpperCase() + animal.species.slice(1)}
          </p>

          {/* Quick Info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
            }}
          >
            <div>
              <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Age</dt>
              <dd style={{ fontWeight: '500', color: '#111827' }}>
                {formatAge(animal.ageYears, animal.ageMonths)}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Sex</dt>
              <dd style={{ fontWeight: '500', color: '#111827' }}>
                {animal.sex ? animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1) : 'Unknown'}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Size</dt>
              <dd style={{ fontWeight: '500', color: '#111827' }}>
                {animal.size ? animal.size.charAt(0).toUpperCase() + animal.size.slice(1) : 'Unknown'}
              </dd>
            </div>
            {animal.color && (
              <div>
                <dt style={{ fontSize: '0.875rem', color: '#6b7280' }}>Color</dt>
                <dd style={{ fontWeight: '500', color: '#111827' }}>{animal.color}</dd>
              </div>
            )}
          </div>

          {/* Attributes */}
          {positiveAttributes.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                About {animal.name}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {positiveAttributes.map((attr) => (
                  <span
                    key={attr}
                    style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                    }}
                  >
                    ✓ {formatAttribute(attr)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          {animal.location && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                Location
              </h3>
              <p style={{ color: '#6b7280' }}>
                {animal.location.name}
                {animal.location.city && `, ${animal.location.city}`}
                {animal.location.state && `, ${animal.location.state}`}
              </p>
            </div>
          )}

          {/* Adoption CTA */}
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <p style={{ marginBottom: '1rem', color: '#374151' }}>
              Interested in adopting {animal.name}?
            </p>
            {animal.adoptionUrl ? (
              <a
                href={animal.adoptionUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '1rem 2rem',
                  backgroundColor: primaryColor,
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '1.125rem',
                  transition: 'opacity 0.2s',
                }}
              >
                Start Adoption Process
              </a>
            ) : (
              <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
                Contact us to learn more about adopting {animal.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {animal.description && (
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            About {animal.name}
          </h2>
          <div
            style={{
              lineHeight: '1.75',
              color: '#374151',
              whiteSpace: 'pre-wrap',
            }}
          >
            {animal.description}
          </div>
        </div>
      )}

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: animal.name,
            description: animal.description || `Adoptable ${animal.species}`,
            image: photos[0],
            category: animal.species,
            offers: {
              '@type': 'Offer',
              availability: 'https://schema.org/InStock',
              url: animal.adoptionUrl,
            },
            brand: {
              '@type': 'Organization',
              name: tenant.name,
            },
          }),
        }}
      />
    </div>
  );
}
