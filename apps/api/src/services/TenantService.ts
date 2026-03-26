import { prisma } from '@pawser/database';
import { Organization, TenantContext } from '@pawser/shared';

/**
 * Service for managing organizations/tenants
 * Handles CRUD operations, credential management, and settings
 */
export class TenantService {
  /**
   * Get organization by ID
   */
  async getOrganization(id: string): Promise<Organization | null> {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        integrationCredentials: true,
        subscriptions: {
          where: { status: 'active' },
          take: 1,
          include: { plan: true },
        },
      },
    });

    if (!org) return null;

    // Map to Organization type
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status as Organization['status'],
      stripeCustomerId: org.stripeCustomerId,
      timezone: org.timezone,
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      deletedAt: org.deletedAt,
      // Include credential status
      hasActiveCredentials: org.integrationCredentials.some(c => c.status === 'active'),
      subscriptionTier: org.subscriptions[0]?.plan?.name || 'trial',
    } as Organization;
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const org = await prisma.organization.findUnique({
      where: { slug },
    });

    if (!org) return null;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status as Organization['status'],
      timezone: org.timezone,
      logoUrl: org.logoUrl,
      primaryColor: org.primaryColor,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    } as Organization;
  }

  /**
   * Get organization by custom domain
   */
  async getOrganizationByDomain(domain: string): Promise<Organization | null> {
    // First try to find by verified domain mapping
    const domainMapping = await prisma.domainMapping.findFirst({
      where: {
        domain,
        verificationStatus: 'verified',
      },
      include: { organization: true },
    });

    if (domainMapping) {
      return domainMapping.organization as unknown as Organization;
    }

    // Fall back to slug-based lookup (subdomain)
    const subdomain = domain.split('.')[0];
    return this.getOrganizationBySlug(subdomain);
  }

  /**
   * List all organizations (admin only)
   */
  async listOrganizations(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ organizations: Organization[]; total: number }> {
    const where = options?.status ? { status: options.status } : {};

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          subscriptions: {
            where: { status: 'active' },
            take: 1,
            include: { plan: true },
          },
          _count: {
            select: { animals: true, memberships: true },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      organizations: orgs.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status as Organization['status'],
        timezone: org.timezone,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        subscriptionTier: org.subscriptions[0]?.plan?.name || 'trial',
        animalCount: org._count.animals,
        memberCount: org._count.memberships,
      })) as Organization[],
      total,
    };
  }

  /**
   * Create new organization
   */
  async createOrganization(data: {
    slug: string;
    name: string;
    status?: string;
    timezone?: string;
    logoUrl?: string;
    primaryColor?: string;
  }): Promise<Organization> {
    const org = await prisma.organization.create({
      data: {
        slug: data.slug,
        name: data.name,
        status: data.status || 'active',
        timezone: data.timezone || 'America/New_York',
        logoUrl: data.logoUrl,
        primaryColor: data.primaryColor,
      },
    });

    return org as unknown as Organization;
  }

  /**
   * Update organization
   */
  async updateOrganization(
    id: string,
    data: Partial<{
      name: string;
      status: string;
      timezone: string;
      logoUrl: string;
      primaryColor: string;
    }>
  ): Promise<Organization> {
    const org = await prisma.organization.update({
      where: { id },
      data,
    });

    return org as unknown as Organization;
  }

  /**
   * Soft delete organization
   */
  async deleteOrganization(id: string): Promise<void> {
    await prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'disabled' },
    });
  }

  /**
   * Get integration credentials for an organization
   */
  async getIntegrationCredentials(organizationId: string, provider?: string) {
    return prisma.integrationCredential.findMany({
      where: {
        orgId: organizationId,
        ...(provider ? { provider } : {}),
      },
    });
  }

  /**
   * Create or update integration credentials
   */
  async upsertIntegrationCredential(
    organizationId: string,
    data: {
      provider: string;
      secretCiphertext: string;
      secretIv: string;
      secretTag: string;
      accountLabel?: string;
      externalAccountId?: string;
      scope?: string;
    }
  ) {
    // Check if credentials already exist for this org/provider
    const existing = await prisma.integrationCredential.findFirst({
      where: {
        orgId: organizationId,
        provider: data.provider,
      },
    });

    if (existing) {
      return prisma.integrationCredential.update({
        where: { id: existing.id },
        data: {
          secretCiphertext: data.secretCiphertext,
          secretIv: data.secretIv,
          secretTag: data.secretTag,
          accountLabel: data.accountLabel,
          externalAccountId: data.externalAccountId,
          scope: data.scope,
          status: 'active',
        },
      });
    }

    return prisma.integrationCredential.create({
      data: {
        orgId: organizationId,
        provider: data.provider,
        secretCiphertext: data.secretCiphertext,
        secretIv: data.secretIv,
        secretTag: data.secretTag,
        accountLabel: data.accountLabel,
        externalAccountId: data.externalAccountId,
        scope: data.scope,
      },
    });
  }

  /**
   * Get organization setting by key
   */
  async getSetting(organizationId: string, key: string) {
    return prisma.organizationSetting.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });
  }

  /**
   * Get all settings for an organization
   */
  async getSettings(organizationId: string) {
    return prisma.organizationSetting.findMany({
      where: { organizationId },
    });
  }

  /**
   * Set organization setting
   */
  async setSetting(organizationId: string, key: string, value: unknown) {
    return prisma.organizationSetting.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
      create: {
        organizationId,
        key,
        value: value as object,
      },
      update: {
        value: value as object,
      },
    });
  }

  /**
   * Delete organization setting
   */
  async deleteSetting(organizationId: string, key: string): Promise<void> {
    await prisma.organizationSetting.delete({
      where: {
        organizationId_key: {
          organizationId,
          key,
        },
      },
    });
  }
}
