import { prisma } from '@pawser/database';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface TenantContext {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
}

async function resolveTenant(slugOrDomain: string): Promise<TenantContext | null> {
  // First try slug lookup (most common - URL path like /demo-shelter/animals)
  let org = await prisma.organization.findUnique({
    where: { slug: slugOrDomain },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      primaryColor: true,
      status: true,
      deletedAt: true,
    },
  });

  // If not found by slug, try domain mapping (for custom domains)
  if (!org) {
    const domainMapping = await prisma.domainMapping.findFirst({
      where: {
        domain: slugOrDomain.toLowerCase(),
        verificationStatus: 'verified',
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
    org = domainMapping?.organization || null;
  }

  if (org && org.status === 'active' && !org.deletedAt) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: { domain: string };
}): Promise<Metadata> {
  // Use the domain param from URL path (e.g., /demo-shelter/animals)
  const tenant = await resolveTenant(params.domain);

  if (!tenant) {
    return { title: 'Not Found' };
  }

  return {
    title: {
      default: `${tenant.name} - Adoptable Animals`,
      template: `%s | ${tenant.name}`,
    },
    description: `Find your perfect companion at ${tenant.name}. Browse our adoptable dogs, cats, and other animals.`,
    openGraph: {
      type: 'website',
      siteName: tenant.name,
    },
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { domain: string };
}) {
  // Use the domain param from URL path (e.g., /demo-shelter/animals)
  const tenant = await resolveTenant(params.domain);

  if (!tenant) {
    notFound();
  }

  // CSS custom properties for theming
  const primaryColor = tenant.primaryColor || '#3b82f6';
  const primaryColorLight = `${primaryColor}20`;

  return (
    <div
      className="tenant-root"
      style={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['--tenant-primary' as any]: primaryColor,
        ['--tenant-primary-light' as any]: primaryColorLight,
        minHeight: '100vh',
        backgroundColor: '#fafafa',
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '1rem 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                style={{ height: '40px', width: 'auto' }}
              />
            ) : (
              <span
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: primaryColor,
                }}
              >
                {tenant.name}
              </span>
            )}
          </div>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a
              href={`/${params.domain}/animals`}
              style={{
                color: '#374151',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              Adopt
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ minHeight: 'calc(100vh - 180px)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: '#1f2937',
          color: '#9ca3af',
          padding: '2rem',
          marginTop: '2rem',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <p style={{ marginBottom: '0.5rem' }}>
            © {new Date().getFullYear()} {tenant.name}
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            Powered by{' '}
            <a
              href="https://pawser.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#60a5fa' }}
            >
              Pawser
            </a>
          </p>
        </div>
      </footer>

      {/* Pass tenant context to children via data attribute */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__TENANT__ = ${JSON.stringify(tenant)}`,
        }}
      />
    </div>
  );
}
