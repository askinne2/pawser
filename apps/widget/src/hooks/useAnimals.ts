import { useState, useEffect } from 'react';
import axios from 'axios';
import type { PawserAnimal, AnimalListResponse, MediaAsset } from '../types';
import { coerceString } from '../utils/animalDisplay';

interface UseAnimalsParams {
  apiUrl: string;
  orgSlug: string;
  page?: number;
  pageSize?: number;
  species?: string;
  sex?: string;
  size?: string;
  search?: string;
  sort?: string;
}

interface UseAnimalsResult {
  animals: PawserAnimal[];
  total: number;
  loading: boolean;
  error: string | null;
}

/** List API may return `photoUrl` only or null strings; normalize for safe rendering. */
function normalizeListAnimal(raw: Record<string, unknown>): PawserAnimal {
  const base = raw as unknown as PawserAnimal;
  const existing = raw.mediaAssets;
  let mediaAssets: MediaAsset[] = [];
  if (Array.isArray(existing) && existing.length > 0) {
    mediaAssets = existing as MediaAsset[];
  } else {
    const photoUrl = raw.photoUrl as string | null | undefined;
    if (photoUrl) {
      mediaAssets = [{ url: photoUrl, isPrimary: true, orderIndex: 0 }];
    }
  }

  const id = coerceString(raw.id);
  return {
    ...base,
    id,
    externalId: coerceString(raw.externalId, id),
    name: coerceString(raw.name, 'Unnamed'),
    species: coerceString(raw.species),
    status: coerceString(raw.status, 'available'),
    breedPrimary: coerceString(raw.breedPrimary),
    breedSecondary: raw.breedSecondary != null ? coerceString(raw.breedSecondary) : undefined,
    color: raw.color != null ? coerceString(raw.color) : undefined,
    sex: coerceString(raw.sex),
    size: coerceString(raw.size),
    slug: coerceString(raw.slug) || id,
    description: raw.description != null ? coerceString(raw.description) : undefined,
    adoptionUrl: raw.adoptionUrl != null ? coerceString(raw.adoptionUrl) : undefined,
    ageYears: (raw.ageYears as number | null | undefined) ?? null,
    ageMonths: (raw.ageMonths as number | null | undefined) ?? null,
    mediaAssets,
    intakeDate: raw.intakeDate != null ? coerceString(raw.intakeDate) : undefined,
  };
}

export function useAnimals({
  apiUrl,
  orgSlug,
  page = 1,
  pageSize = 24,
  species,
  sex,
  size,
  search,
  sort,
}: UseAnimalsParams): UseAnimalsResult {
  const [animals, setAnimals] = useState<PawserAnimal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnimals = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          orgSlug,
          page: String(page),
          perPage: String(pageSize),
          status: 'available',
        });
        if (species && species !== 'all') params.set('species', species);
        if (sex && sex !== 'all') params.set('sex', sex);
        if (size && size !== 'all') params.set('size', size);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);

        const response = await axios.get<AnimalListResponse & { perPage?: number }>(
          `${apiUrl}/api/v1/animals?${params.toString()}`
        );
        const payload = response.data;
        const list = (payload.animals || []).map((a) => normalizeListAnimal(a as unknown as Record<string, unknown>));
        setAnimals(list);
        setTotal(payload.total);
      } catch (err) {
        setError('Failed to load animals');
      } finally {
        setLoading(false);
      }
    };

    fetchAnimals();
  }, [apiUrl, orgSlug, page, pageSize, species, sex, size, search, sort]);

  return { animals, total, loading, error };
}
