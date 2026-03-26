/**
 * Animal types for Pawser platform
 * Based on PRD-01 (Public Animal Portal) and PRD-08 (Database Schema)
 */

// Canonical animal species (normalized from ShelterLuv)
export type AnimalSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';

// Animal status in the system (PRD-08)
export type AnimalStatus = 'available' | 'pending' | 'adopted' | 'foster' | 'hold';

// Sex options
export type AnimalSex = 'male' | 'female' | 'unknown';

// Size options
export type AnimalSize = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * ShelterLuv API animal response format (external)
 * Flexible interface to handle varying API response fields
 */
export interface ShelterLuvAnimal {
  ID: string;
  InternalID: string;
  Name?: string;
  Type?: string;
  Species?: string;
  Status: string;
  StatusType?: string;
  Photos?: Array<string | { URL?: string }>;
  Photo?: string;
  CoverPhoto?: string;
  Breed?: string;
  PrimaryBreed?: string;
  SecondaryBreed?: string;
  Color?: string;
  Coloring?: string;
  Age?: string;
  Sex?: string;
  Size?: string;
  Weight?: string;
  Description?: string;
  LongDescription?: string;
  LastIntakeUnixTime?: number;
  DOBUnixTime?: number;
  AdoptionFeeGroup?: {
    Name: string;
    Price: string;
  };
  AdoptionUrl?: string;
  AdoptionURL?: string;
  ExternalUrl?: string;
  Attributes?: Record<string, boolean | string>;
  Location?: string;
  LocationId?: string;
  [key: string]: unknown;
}

/**
 * Pawser canonical animal format (internal)
 * Matches PRD-08 database schema for 'animals' table
 */
export interface Animal {
  id: string;
  orgId: string;
  dataSourceId: string;
  externalId: string;
  locationId?: string | null;
  name: string;
  slug: string;
  species: AnimalSpecies;
  breedPrimary?: string | null;
  breedSecondary?: string | null;
  ageYears?: number | null;
  ageMonths?: number | null; // Additional granularity beyond PRD-08
  sex?: AnimalSex | null;
  size?: AnimalSize | null;
  color?: string | null;
  status: AnimalStatus;
  description?: string | null;
  attributes?: AnimalAttributes | null;
  published: boolean;
  publishedAt?: Date | null;
  intakeDate?: Date | null;
  birthDate?: Date | null;
  adoptionUrl?: string | null; // For CTA per PRD-01
  lastSeenAt?: Date | null;
  deletedAt?: Date | null; // Soft delete per PRD-08
  createdAt: Date;
  updatedAt: Date;
  // Relations
  mediaAssets?: MediaAsset[];
  location?: Location | null;
}

/**
 * Animal attributes (JSONB field per PRD-08)
 * Used for "good with" tags and other boolean flags per PRD-01
 */
export interface AnimalAttributes {
  goodWithKids?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  houseTrained?: boolean;
  spayedNeutered?: boolean;
  vaccinated?: boolean;
  microchipped?: boolean;
  specialNeeds?: boolean;
  adoptionFee?: number;
  [key: string]: unknown;
}

/**
 * Media asset for animal photos (PRD-08)
 * References Cloudflare R2 URLs/keys
 */
export interface MediaAsset {
  id: string;
  orgId: string;
  animalId: string;
  r2Key?: string | null;
  url: string;
  isPrimary: boolean;
  orderIndex: number;
  width?: number | null;
  height?: number | null;
  etag?: string | null;
  sha256?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Location/Shelter information (PRD-08)
 */
export interface Location {
  id: string;
  orgId: string;
  dataSourceId: string;
  externalId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Animal query parameters (PRD-01 filters)
 * Supports species, age, size, sex, color, breed, location radius,
 * good-with filters, special-needs, name search
 */
export interface AnimalParams {
  // Pagination
  page?: number;
  perPage?: number;
  per_page?: number; // Alias
  limit?: number;
  offset?: number;
  
  // Filters per PRD-01
  species?: AnimalSpecies | string;
  status?: AnimalStatus | string;
  status_type?: string; // ShelterLuv compatibility
  sex?: AnimalSex | string;
  age?: string;
  size?: AnimalSize | string;
  color?: string;
  breed?: string;
  
  // Good-with filters (PRD-01)
  goodWithKids?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  specialNeeds?: boolean;
  
  // Search
  search?: string;
  name?: string;
  
  // Sort (PRD-01: Newest, Longest stay, Name A-Z, Distance)
  sort?: string;
  sort_by?: string;
  sortBy?: string;
  sort_dir?: 'asc' | 'desc';
  sortDir?: 'asc' | 'desc';
  
  // Publish status
  published?: boolean;
  
  // Location-based
  locationId?: string;
  
  [key: string]: unknown;
}

/**
 * Animal card for list views (simplified, per PRD-01 grid cards)
 * 4:3 image, name, primary breed, sex, age, size; status ribbon
 */
export interface AnimalCard {
  id: string;
  slug: string;
  name: string;
  species: AnimalSpecies;
  breed: string;
  age: string;
  size?: string;
  sex?: string;
  status: AnimalStatus;
  photoUrl?: string;
  // PRD-01: badges (good with, special needs)
  goodWithKids?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  specialNeeds?: boolean;
}

/**
 * Paginated response for animal list
 */
export interface AnimalListResponse {
  animals: Animal[] | AnimalCard[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Legacy type alias for backwards compatibility
export type CachedAnimal = Animal;
