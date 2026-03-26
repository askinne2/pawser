/**
 * Tenant/Organization types for Pawser multi-tenant platform
 */

export type OrganizationStatus = 'active' | 'suspended' | 'disabled' | 'trial';
export type SubscriptionTier = 'trial' | 'basic' | 'pro' | 'enterprise';
export type MembershipRole = 'owner' | 'admin' | 'viewer';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  stripeCustomerId?: string | null;
  timezone: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TenantContext {
  organization: Organization;
  organizationId: string;
  subscription?: Subscription | null;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  isSuperAdmin: boolean;
  disabled: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Membership {
  id: string;
  orgId: string;
  userId: string;
  role: MembershipRole;
  invitedByUserId?: string | null;
  acceptedAt?: Date | null;
  createdAt: Date;
}

export interface DomainMapping {
  id: string;
  orgId: string;
  domain: string;
  isPrimary: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed';
  sslStatus: 'pending' | 'active' | 'expired';
  cloudflareZoneId?: string | null;
  dnsValidationToken?: string | null;
  verifiedAt?: Date | null;
  createdAt: Date;
}

export interface IntegrationCredential {
  id: string;
  orgId: string;
  provider: string;
  accountLabel?: string | null;
  externalAccountId?: string | null;
  scope?: string | null;
  status: 'active' | 'invalid' | 'revoked';
  lastValidatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSource {
  id: string;
  orgId: string;
  provider: string;
  credentialsId: string;
  externalAccountId?: string | null;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  code: SubscriptionTier;
  name: string;
  description?: string | null;
  syncIntervalSeconds: number;
  maxAdmins: number;
  priceCents: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  orgId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  trialEnd?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSetting {
  id: string;
  organizationId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy types for backwards compatibility
export interface OrganizationCredentials {
  id: string;
  organizationId: string;
  apiKey: string;
  orgPrefix?: string | null;
  isActive: boolean;
  lastSyncAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}