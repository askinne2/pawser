import axios, { AxiosInstance } from 'axios';
import { Animal, AnimalParams } from '@pawser/shared';

/** One page from GET /animals — includes ShelterLuv pagination flags */
export interface ShelterLuvAnimalsPage {
  animals: Animal[];
  /** From API `has_more`; when absent, inferred from page size vs limit */
  hasMore: boolean;
  /** From API `total_count` when present */
  totalCount: number | null;
}

/**
 * Service for interacting with ShelterLuv API
 * Handles API calls with tenant-specific credentials
 */
export class ShelterLuvService {
  private client: AxiosInstance;
  private apiKey: string;
  private orgPrefix?: string;

  constructor(apiKey: string, orgPrefix?: string) {
    this.apiKey = apiKey;
    this.orgPrefix = orgPrefix;

    this.client = axios.create({
      baseURL: 'https://www.shelterluv.com/api/v1',
      timeout: 30000, // 30 seconds
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get animals from ShelterLuv API (one page, with pagination metadata)
   */
  async getAnimals(params: AnimalParams = {}): Promise<ShelterLuvAnimalsPage> {
    try {
      // Format parameters for ShelterLuv API
      const queryParams: Record<string, string> = {};

      // Status filtering: ShelterLuv API uses status_type parameter
      if (params.status_type) {
        queryParams.status_type = params.status_type;
      } else {
        queryParams.status_type = 'publishable';
      }

      // Pagination — always send page when provided (use >= 1; 0 is invalid)
      if (params.page !== undefined && params.page !== null) {
        queryParams.page = String(params.page);
      }
      if (params.limit) {
        queryParams.limit = params.limit.toString();
      } else if (params.per_page) {
        queryParams.limit = params.per_page.toString();
      } else {
        queryParams.limit = '100'; // Default limit
      }

      if (params.offset) {
        queryParams.offset = params.offset.toString();
      }

      // Filters
      if (params.species) queryParams.species = params.species;
      if (params.sex) queryParams.sex = params.sex;
      if (params.age) queryParams.age = params.age;
      if (params.size) queryParams.size = params.size;
      if (params.search) queryParams.search = params.search;

      // Sorting
      if (params.sort_by) queryParams.sort_by = params.sort_by;
      if (params.sort_dir) queryParams.sort_dir = params.sort_dir;

      const response = await this.client.get('/animals', {
        params: queryParams,
      });

      const data = response.data as Record<string, unknown> | undefined;
      const animals = data && Array.isArray(data.animals) ? (data.animals as Animal[]) : [];

      const limitNum = parseInt(queryParams.limit || '100', 10);
      const rawHasMore = data?.has_more;
      const rawTotal = data?.total_count;

      let hasMore: boolean;
      if (typeof rawHasMore === 'boolean') {
        hasMore = rawHasMore;
      } else {
        // Older responses without has_more: assume another page only if this one is full
        hasMore = animals.length >= limitNum && animals.length > 0;
      }

      const totalCount = typeof rawTotal === 'number' ? rawTotal : null;

      return { animals, hasMore, totalCount };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `ShelterLuv API error: ${error.response?.status} - ${error.response?.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Get a single animal by ID
   */
  async getAnimal(id: string): Promise<Animal> {
    try {
      // If org prefix is provided, prepend it to the ID
      const animalId = this.orgPrefix ? `${this.orgPrefix}${id}` : id;

      const response = await this.client.get(`/animals/${animalId}`);

      if (response.data) {
        return response.data as Animal;
      }

      throw new Error(`Animal ${id} not found`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Animal ${id} not found`);
        }
        throw new Error(
          `ShelterLuv API error: ${error.response?.status} - ${error.response?.statusText}`
        );
      }
      throw error;
    }
  }

  /**
   * Get filters/facets from ShelterLuv API
   */
  async getFilters(): Promise<Record<string, string[]>> {
    try {
      const response = await this.client.get('/filters');

      if (response.data && response.data.filters) {
        return response.data.filters as Record<string, string[]>;
      }

      return {};
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `ShelterLuv API error: ${error.response?.status} - ${error.response?.statusText}`
        );
      }
      throw error;
    }
  }
}

