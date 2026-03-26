/**
 * API request/response types for Pawser platform
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Specific API error codes
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REFRESH_TOKEN_INVALID: 'REFRESH_TOKEN_INVALID',
  MAGIC_LINK_EXPIRED: 'MAGIC_LINK_EXPIRED',
  
  // Tenant errors
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  ORG_SUSPENDED: 'ORG_SUSPENDED',
  ORG_DISABLED: 'ORG_DISABLED',
  
  // RBAC errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_ROLE: 'INSUFFICIENT_ROLE',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Sync errors
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',
  SYNC_FAILED: 'SYNC_FAILED',
  CREDENTIALS_INVALID: 'CREDENTIALS_INVALID',
  
  // Billing errors
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  TRIAL_EXPIRED: 'TRIAL_EXPIRED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name?: string;
    isSuperAdmin: boolean;
  };
  memberships?: Array<{
    orgId: string;
    orgName: string;
    role: string;
  }>;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MagicLinkRequest {
  email: string;
  orgId?: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
}

// Animal API types
export interface AnimalsApiResponse {
  animals: unknown[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface AnimalApiResponse {
  animal: unknown;
}

// Organization API types
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  ownerEmail: string;
  planCode?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
}

// Subdomain API types
export interface SubdomainAvailabilityRequest {
  slug: string;
}

export interface SubdomainAvailabilityResponse {
  available: boolean;
  reason?: string;
}

export interface UpdateSubdomainRequest {
  slug: string;
}