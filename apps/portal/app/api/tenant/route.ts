import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@pawser/database';

/**
 * GET /api/tenant
 * Resolve tenant from hostname
 * Returns tenant configuration for the current domain
 */
export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get('host') || '';

    if (!hostname) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad request',
          message: 'Host header is required',
        },
        { status: 400 }
      );
    }

    // Try custom domain first
    let org = await prisma.organization.findFirst({
      where: {
        customDomain: hostname,
        status: 'active',
      },
      include: {
        settings: true,
      },
    });

    // Fallback to subdomain
    if (!org) {
      const subdomain = hostname.split('.')[0];
      org = await prisma.organization.findFirst({
        where: {
          subdomain: subdomain,
          status: 'active',
        },
        include: {
          settings: true,
        },
      });
    }

    if (!org) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: `No active organization found for hostname: ${hostname}`,
        },
        { status: 404 }
      );
    }

    // Transform settings to key-value object
    const settings: Record<string, unknown> = {};
    for (const setting of org.settings) {
      settings[setting.key] = setting.value;
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: org.id,
        slug: org.slug,
        name: org.name,
        customDomain: org.customDomain,
        subdomain: org.subdomain,
        status: org.status,
        subscriptionTier: org.subscriptionTier,
        settings,
      },
    });
  } catch (error) {
    console.error('Error resolving tenant:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to resolve tenant',
      },
      { status: 500 }
    );
  }
}

