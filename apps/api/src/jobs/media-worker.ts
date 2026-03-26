import { Queue, Worker, Job } from 'bullmq';
import { prisma } from '@pawser/database';
import crypto from 'crypto';

/**
 * Media upload job payload
 */
interface MediaJobData {
  orgId: string;
  animalId: string;
  sourceUrl: string;
  mediaAssetId: string;
}

/**
 * Media upload result
 */
interface MediaResult {
  success: boolean;
  mediaAssetId: string;
  r2Key?: string;
  width?: number;
  height?: number;
  sha256?: string;
  error?: string;
}

/**
 * R2 Configuration
 */
const R2_CONFIG = {
  accountId: process.env.CF_ACCOUNT_ID || '',
  accessKeyId: process.env.CF_R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY || '',
  bucket: process.env.CF_R2_BUCKET || 'pawser-images',
  publicUrl: process.env.CF_R2_PUBLIC_URL || '',
};

/**
 * BullMQ queue for media upload jobs
 */
export const mediaQueue = new Queue<MediaJobData>('media-upload', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 3600,
      count: 500,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
  },
});

/**
 * Schedule a media upload job
 */
export async function scheduleMediaUpload(
  orgId: string,
  animalId: string,
  sourceUrl: string,
  mediaAssetId: string
): Promise<string> {
  const job = await mediaQueue.add(
    'upload-media',
    { orgId, animalId, sourceUrl, mediaAssetId },
    {
      jobId: `media-${mediaAssetId}`,
      // Deduplicate by URL hash
      deduplication: {
        id: `media-${crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16)}`,
      },
    }
  );
  return job.id || '';
}

/**
 * Batch schedule media uploads for an animal
 */
export async function scheduleAnimalMediaUploads(
  orgId: string,
  animalId: string,
  mediaAssets: Array<{ id: string; url: string }>
): Promise<string[]> {
  const jobIds: string[] = [];
  
  for (const asset of mediaAssets) {
    const jobId = await scheduleMediaUpload(orgId, animalId, asset.url, asset.id);
    jobIds.push(jobId);
  }
  
  return jobIds;
}

/**
 * Generate R2 key from organization, animal, and source URL
 */
function generateR2Key(orgId: string, animalId: string, sourceUrl: string, index: number): string {
  const urlHash = crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0, 12);
  const ext = getExtensionFromUrl(sourceUrl);
  return `orgs/${orgId}/animals/${animalId}/${index}-${urlHash}${ext}`;
}

/**
 * Extract file extension from URL
 */
function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return `.${ext}`;
    }
  } catch {
    // Invalid URL
  }
  return '.jpg'; // Default extension
}

/**
 * Calculate SHA256 hash of buffer
 */
function calculateSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload image to Cloudflare R2
 * Note: This is a stub implementation. In production, use @aws-sdk/client-s3
 * with R2-compatible endpoint.
 */
async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ success: boolean; etag?: string; error?: string }> {
  // Check if R2 is configured
  if (!R2_CONFIG.accountId || !R2_CONFIG.accessKeyId) {
    console.warn('R2 not configured, skipping upload');
    return { success: false, error: 'R2 not configured' };
  }

  try {
    // In production, use @aws-sdk/client-s3:
    // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    // const client = new S3Client({
    //   region: 'auto',
    //   endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
    //   credentials: {
    //     accessKeyId: R2_CONFIG.accessKeyId,
    //     secretAccessKey: R2_CONFIG.secretAccessKey,
    //   },
    // });
    // const response = await client.send(new PutObjectCommand({
    //   Bucket: R2_CONFIG.bucket,
    //   Key: key,
    //   Body: buffer,
    //   ContentType: contentType,
    // }));

    // Stub: return success for now
    console.log(`[STUB] Would upload to R2: ${key} (${buffer.length} bytes)`);
    return {
      success: true,
      etag: crypto.createHash('md5').update(buffer).digest('hex'),
    };
  } catch (error) {
    console.error('R2 upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Fetch image from source URL
 */
async function fetchImage(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
  width?: number;
  height?: number;
} | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Pawser/1.0 (Image Sync)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // For image dimensions, you would typically use sharp or similar library
    // const sharp = require('sharp');
    // const metadata = await sharp(buffer).metadata();
    // return { buffer, contentType, width: metadata.width, height: metadata.height };

    return { buffer, contentType };
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

/**
 * Media upload worker
 */
export const mediaWorker = new Worker<MediaJobData>(
  'media-upload',
  async (job: Job<MediaJobData>): Promise<MediaResult> => {
    const { orgId, animalId, sourceUrl, mediaAssetId } = job.data;

    console.log(`Processing media upload: ${mediaAssetId}`);

    try {
      // Get media asset record
      const mediaAsset = await prisma.mediaAsset.findUnique({
        where: { id: mediaAssetId },
      });

      if (!mediaAsset) {
        throw new Error(`MediaAsset ${mediaAssetId} not found`);
      }

      // Skip if already uploaded to R2
      if (mediaAsset.r2Key && mediaAsset.sha256) {
        console.log(`MediaAsset ${mediaAssetId} already uploaded to R2`);
        return {
          success: true,
          mediaAssetId,
          r2Key: mediaAsset.r2Key,
          sha256: mediaAsset.sha256,
        };
      }

      // Fetch image from source
      const fetchResult = await fetchImage(sourceUrl);
      if (!fetchResult) {
        throw new Error(`Failed to fetch image from ${sourceUrl}`);
      }

      const { buffer, contentType, width, height } = fetchResult;
      const sha256 = calculateSha256(buffer);

      // Check for duplicate by SHA256
      const existingByHash = await prisma.mediaAsset.findFirst({
        where: {
          orgId,
          sha256,
          r2Key: { not: null },
        },
      });

      let r2Key: string | undefined;
      let etag: string | undefined;

      if (existingByHash?.r2Key) {
        // Reuse existing R2 key for duplicate
        r2Key = existingByHash.r2Key;
        etag = existingByHash.etag || undefined;
        console.log(`Reusing existing R2 key for duplicate: ${r2Key}`);
      } else {
        // Generate new R2 key and upload
        r2Key = generateR2Key(orgId, animalId, sourceUrl, mediaAsset.orderIndex);
        
        const uploadResult = await uploadToR2(r2Key, buffer, contentType);
        if (!uploadResult.success) {
          // Don't fail the job, just log and continue without R2
          console.warn(`R2 upload failed: ${uploadResult.error}`);
          r2Key = undefined;
        } else {
          etag = uploadResult.etag;
        }
      }

      // Update media asset record
      await prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: {
          r2Key,
          sha256,
          etag,
          width,
          height,
        },
      });

      console.log(`Media upload completed: ${mediaAssetId} -> ${r2Key || 'no R2'}`);

      return {
        success: true,
        mediaAssetId,
        r2Key,
        width,
        height,
        sha256,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Media upload failed for ${mediaAssetId}:`, errorMessage);
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 10, // Process up to 10 media jobs concurrently
    limiter: {
      max: 50, // Max 50 jobs per second
      duration: 1000,
    },
  }
);

// Worker event handlers
mediaWorker.on('completed', (job, result: MediaResult) => {
  console.log(`Media job ${job.id} completed: ${result.r2Key || 'no R2 upload'}`);
});

mediaWorker.on('failed', (job, err) => {
  console.error(`Media job ${job?.id} failed:`, err.message);
});

mediaWorker.on('error', (err) => {
  console.error('Media worker error:', err);
});

// Start worker if this file is run directly
if (require.main === module) {
  console.log('Media worker started');
}
