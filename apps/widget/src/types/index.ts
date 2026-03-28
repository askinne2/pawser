export interface PawserSettings {
  apiUrl: string;
  orgSlug: string;
  primaryColor?: string;
  adoptUrlBase?: string;
  animalsPerPage?: number;
  defaultSpecies?: string;
}

export interface MediaAsset {
  url: string;
  isPrimary: boolean;
  orderIndex: number;
}

export interface PawserAnimal {
  id: string;
  externalId: string;
  name: string;
  species: string;
  status: string;
  breedPrimary: string;
  breedSecondary?: string;
  color?: string;
  sex: string;
  size: string;
  ageYears: number | null;
  ageMonths: number | null;
  description?: string;
  adoptionUrl?: string;
  slug: string;
  mediaAssets: MediaAsset[];
  attributes?: Record<string, boolean>;
  intakeDate?: string;
}

export interface AnimalListResponse {
  animals: PawserAnimal[];
  total: number;
  page: number;
  pageSize: number;
}

declare global {
  interface Window {
    pawserSettings?: PawserSettings;
  }
}
