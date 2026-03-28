import { useState, useEffect } from 'react';
import axios from 'axios';
import type { PawserAnimal } from '../types';

interface UseAnimalResult {
  animal: PawserAnimal | null;
  loading: boolean;
  error: string | null;
}

export function useAnimal(apiUrl: string, animalId: string): UseAnimalResult {
  const [animal, setAnimal] = useState<PawserAnimal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnimal = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<PawserAnimal>(
          `${apiUrl}/api/v1/animals/${animalId}`
        );
        setAnimal(response.data);
      } catch (err) {
        setError('Failed to load animal');
      } finally {
        setLoading(false);
      }
    };

    if (animalId) fetchAnimal();
  }, [apiUrl, animalId]);

  return { animal, loading, error };
}
