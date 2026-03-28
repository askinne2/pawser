import { useState, useEffect } from 'react';
import axios from 'axios';
import type { PawserAnimal, MediaAsset } from '../types';
import { coerceString } from '../utils/animalDisplay';

interface UseAnimalResult {
  animal: PawserAnimal | null;
  loading: boolean;
  error: string | null;
}

interface ApiPhoto {
  url: string;
  isPrimary: boolean;
  orderIndex: number;
}

interface ApiAnimalPayload {
  id: string;
  externalId?: string | null;
  name?: string | null;
  species?: string | null;
  status?: string | null;
  breedPrimary?: string | null;
  breedSecondary?: string | null;
  color?: string | null;
  sex?: string | null;
  size?: string | null;
  ageYears: number | null;
  ageMonths: number | null;
  description?: string | null;
  adoptionUrl?: string | null;
  slug?: string | null;
  intakeDate?: string | null;
  attributes?: Record<string, boolean>;
  photos?: ApiPhoto[];
  mediaAssets?: MediaAsset[];
  photoUrl?: string | null;
}

interface ApiAnimalResponse {
  success?: boolean;
  animal?: ApiAnimalPayload;
}

function toMediaAssets(payload: ApiAnimalPayload): MediaAsset[] {
  if (payload.mediaAssets?.length) {
    return payload.mediaAssets;
  }
  if (payload.photos?.length) {
    return payload.photos.map((p) => ({
      url: p.url,
      isPrimary: p.isPrimary,
      orderIndex: p.orderIndex,
    }));
  }
  const photoUrl = payload.photoUrl != null ? coerceString(payload.photoUrl) : '';
  if (photoUrl) {
    return [{ url: photoUrl, isPrimary: true, orderIndex: 0 }];
  }
  return [];
}

function normalizeAnimal(payload: ApiAnimalPayload): PawserAnimal {
  const { photos: _p, mediaAssets: _m, photoUrl: _u, ...rest } = payload;
  const id = coerceString(payload.id);
  return {
    ...rest,
    id,
    externalId: coerceString(payload.externalId, id),
    name: coerceString(payload.name, 'Unnamed'),
    species: coerceString(payload.species),
    status: coerceString(payload.status, 'available'),
    breedPrimary: coerceString(payload.breedPrimary),
    breedSecondary: payload.breedSecondary != null ? coerceString(payload.breedSecondary) : undefined,
    color: payload.color != null ? coerceString(payload.color) : undefined,
    sex: coerceString(payload.sex),
    size: coerceString(payload.size),
    slug: coerceString(payload.slug) || id,
    description: payload.description != null ? coerceString(payload.description) : undefined,
    adoptionUrl: payload.adoptionUrl != null ? coerceString(payload.adoptionUrl) : undefined,
    intakeDate: payload.intakeDate != null ? coerceString(payload.intakeDate) : undefined,
    mediaAssets: toMediaAssets(payload),
  };
}

export function useAnimal(apiUrl: string, orgSlug: string, animalId: string): UseAnimalResult {
  const [animal, setAnimal] = useState<PawserAnimal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!animalId?.trim() || !orgSlug?.trim()) {
      setAnimal(null);
      setError(!orgSlug?.trim() ? 'Missing organization' : null);
      setLoading(false);
      return;
    }

    const fetchAnimal = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ orgSlug });
        const response = await axios.get<ApiAnimalResponse | ApiAnimalPayload>(
          `${apiUrl}/api/v1/animals/${encodeURIComponent(animalId)}?${qs.toString()}`
        );
        const data = response.data;
        const raw =
          data && typeof data === 'object' && 'animal' in data && data.animal
            ? data.animal
            : (data as ApiAnimalPayload);
        if (!raw || !raw.id) {
          setAnimal(null);
          return;
        }
        setAnimal(normalizeAnimal(raw));
      } catch (err) {
        setError('Failed to load animal');
        setAnimal(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAnimal();
  }, [apiUrl, orgSlug, animalId]);

  return { animal, loading, error };
}
