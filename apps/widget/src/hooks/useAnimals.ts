import { useState, useEffect } from 'react';
import axios from 'axios';
import type { PawserAnimal, AnimalListResponse } from '../types';

interface UseAnimalsParams {
  apiUrl: string;
  orgSlug: string;
  page?: number;
  pageSize?: number;
  species?: string;
  search?: string;
  sort?: string;
}

interface UseAnimalsResult {
  animals: PawserAnimal[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useAnimals({
  apiUrl,
  orgSlug,
  page = 1,
  pageSize = 24,
  species,
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
          pageSize: String(pageSize),
          status: 'available',
        });
        if (species && species !== 'all') params.set('species', species);
        if (search) params.set('search', search);
        if (sort) params.set('sort', sort);

        const response = await axios.get<AnimalListResponse>(
          `${apiUrl}/api/v1/animals?${params.toString()}`
        );
        setAnimals(response.data.animals);
        setTotal(response.data.total);
      } catch (err) {
        setError('Failed to load animals');
      } finally {
        setLoading(false);
      }
    };

    fetchAnimals();
  }, [apiUrl, orgSlug, page, pageSize, species, search, sort]);

  return { animals, total, loading, error };
}
