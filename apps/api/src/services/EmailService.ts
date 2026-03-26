import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Email job types
export type EmailType =
  | 'magic-link'
  | 'invitation'
  | 'password-reset'
  | 'trial-ending'
  | 'welcome'
  | 'sync-failed';

// Email job data interface
export interface EmailJob {
  type: EmailType;
  to: string;
  subject: string;
  templateData: Record<string, unknown>;
  tenantId?: string; // For white-label branding
  priority?: 'high' | 'normal';
}

// Redis connection for BullMQ
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Email queue
const emailQueue = new Queue<EmailJob>('email', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Email Service
 * Handles queueing of transactional emails via BullMQ
 */
class EmailService {
  private queue: Queue<EmailJob>;

  constructor() {
    this.queue = emailQueue;
  }

  /**
   * Send a magic link email for passwordless authentication
   */
  async sendMagicLink(
    email: string,
    token: string,
    name?: string,
    tenantId?: string
  ): Promise<string> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    const job = await this.queue.add(
      'email',
      {
        type: 'magic-link',
        to: email,
        subject: 'Sign in to Pawser',
        templateData: {
          name: name || 'there',
          magicLinkUrl: `${appUrl}/auth/magic?token=${token}`,
          expiresIn: '15 minutes',
        },
        tenantId,
        priority: 'high',
      },
      { priority: 1 }
    );

    console.log(`[Email] Queued magic-link email to ${email} (job: ${job.id})`);
    return job.id!;
  }

  /**
   * Send a team invitation email
   */
  async sendInvitation(
    email: string,
    inviterName: string,
    orgName: string,
    role: string,
    token: string,
    message?: string,
    tenantId?: string
  ): Promise<string> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    const job = await this.queue.add(
      'email',
      {
        type: 'invitation',
        to: email,
        subject: `You've been invited to join ${orgName} on Pawser`,
        templateData: {
          inviterName,
          orgName,
          role,
          personalMessage: message,
          invitationUrl: `${appUrl}/invite/accept?token=${token}`,
          expiresIn: '7 days',
        },
        tenantId,
        priority: 'high',
      },
      { priority: 1 }
    );

    console.log(`[Email] Queued invitation email to ${email} for org ${orgName} (job: ${job.id})`);
    return job.id!;
  }

  /**
   * Send a password reset email
   */
  async sendPasswordReset(
    email: string,
    name: string,
    token: string
  ): Promise<string> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    const job = await this.queue.add(
      'email',
      {
        type: 'password-reset',
        to: email,
        subject: 'Reset your Pawser password',
        templateData: {
          name: name || 'there',
          resetUrl: `${appUrl}/auth/reset-password?token=${token}`,
          expiresIn: '1 hour',
        },
        priority: 'high',
      },
      { priority: 1 }
    );

    console.log(`[Email] Queued password-reset email to ${email} (job: ${job.id})`);
    return job.id!;
  }

  /**
   * Send a trial ending notification email
   */
  async sendTrialEnding(
    email: string,
    name: string,
    orgName: string,
    trialEndDate: Date,
    tenantId?: string
  ): Promise<string> {
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';
    
    const job = await this.queue.add(
      'email',
      {
        type: 'trial-ending',
        to: email,
        subject: 'Your Pawser trial ends in 3 days',
        templateData: {
          name,
          orgName,
          trialEndDate: trialEndDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          billingUrl: `${adminUrl}/billing`,
        },
        tenantId,
        priority: 'normal',
      }
    );

    console.log(`[Email] Queued trial-ending email to ${email} (job: ${job.id})`);
    return job.id!;
  }

  /**
   * Send a welcome email after first login
   */
  async sendWelcome(
    email: string,
    name: string,
    orgName?: string,
    tenantId?: string
  ): Promise<string> {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    const job = await this.queue.add(
      'email',
      {
        type: 'welcome',
        to: email,
        subject: 'Welcome to Pawser!',
        templateData: {
          name: name || 'there',
          orgName,
          dashboardUrl: `${appUrl}/dashboard`,
          docsUrl: 'https://docs.pawser.app',
        },
        tenantId,
        priority: 'normal',
      }
    );

    console.log(`[Email] Queued welcome email to ${email} (job: ${job.id})`);
    return job.id!;
  }

  /**
   * Send a sync failure notification email
   */
  async sendSyncFailed(
    email: string,
    name: string,
    orgName: string,
    errorMessage: string,
    tenantId?: string
  ): Promise<string> {
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';
    
    const job = await this.queue.add(
      'email',
      {
        type: 'sync-failed',
        to: email,
        subject: `Sync failed for ${orgName}`,
        templateData: {
          name,
          orgName,
          errorMessage,
          settingsUrl: `${adminUrl}/organizations/settings`,
        },
        tenantId,
        priority: 'normal',
      }
    );

    console.log(`[Email] Queued sync-failed email to ${email} (job: ${job.id})`);
    return job.id!;
  }

  /**
   * Get the status of an email job
   */
  async getJobStatus(jobId: string): Promise<{
    status: 'pending' | 'active' | 'completed' | 'failed';
    error?: string;
  }> {
    const job = await this.queue.getJob(jobId);
    
    if (!job) {
      return { status: 'pending' };
    }

    const state = await job.getState();
    
    if (state === 'completed') {
      return { status: 'completed' };
    }
    
    if (state === 'failed') {
      return { status: 'failed', error: job.failedReason || 'Unknown error' };
    }
    
    if (state === 'active') {
      return { status: 'active' };
    }
    
    return { status: 'pending' };
  }

  /**
   * Close the queue connection (for graceful shutdown)
   */
  async close(): Promise<void> {
    await this.queue.close();
    await redisConnection.quit();
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

export { emailQueue };
export default EmailService;
