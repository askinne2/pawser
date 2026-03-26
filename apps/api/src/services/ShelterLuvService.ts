import axios, { AxiosInstance } from 'axios';
import { Animal, AnimalParams } from '@pawser/shared';

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
   * Get animals from ShelterLuv API
   */
  async getAnimals(params: AnimalParams = {}): Promise<Animal[]> {
    try {
      // Format parameters for ShelterLuv API
      const queryParams: Record<string, string> = {};

      // Status filtering: ShelterLuv API uses status_type parameter
      // Note: status_type='publishable' gets all publishable animals (including historical)
      // We'll filter by actual Status field after fetching to get only currently available
      if (params.status_type) {
        queryParams.status_type = params.status_type;
      } else {
        // Default to publishable - we'll filter by Status='Available' in the sync worker
        queryParams.status_type = 'publishable';
      }
      
      // Note: ShelterLuv API doesn't support filtering by actual Status field in the query
      // We must filter results after fetching

      // Pagination
      if (params.page) {
        queryParams.page = params.page.toString();
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

      if (response.data && Array.isArray(response.data.animals)) {
        return response.data.animals as Animal[];
      }

      return [];
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

