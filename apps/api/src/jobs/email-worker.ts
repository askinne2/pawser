import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@pawser/database';
import { EmailJob } from '../services/EmailService';

// Redis connection for the worker
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Email templates as HTML strings (simple version without React Email for now)
// In production, you would use React Email to render these templates
const emailTemplates: Record<string, (data: Record<string, unknown>) => string> = {
  'magic-link': (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <img src="${process.env.APP_URL || 'https://pawser.app'}/logo.png" alt="Pawser" style="height: 32px; margin-bottom: 24px;">
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Sign in to Pawser</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Hi ${data.name},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Click the button below to sign in to your account. This link expires in ${data.expiresIn}.
      </p>
      <a href="${data.magicLinkUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">Sign In</a>
      <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      Pawser · ${new Date().getFullYear()}
    </p>
  </div>
</body>
</html>
`,

  'invitation': (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <img src="${process.env.APP_URL || 'https://pawser.app'}/logo.png" alt="Pawser" style="height: 32px; margin-bottom: 24px;">
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">You've been invited!</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        ${data.inviterName} has invited you to join <strong>${data.orgName}</strong> as a <strong>${data.role}</strong>.
      </p>
      ${data.personalMessage ? `<div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 0 0 24px;"><p style="color: #4b5563; font-size: 14px; line-height: 20px; margin: 0; font-style: italic;">"${data.personalMessage}"</p></div>` : ''}
      <a href="${data.invitationUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">Accept Invitation</a>
      <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
        This invitation expires in ${data.expiresIn}.
      </p>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      Pawser · ${new Date().getFullYear()}
    </p>
  </div>
</body>
</html>
`,

  'password-reset': (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <img src="${process.env.APP_URL || 'https://pawser.app'}/logo.png" alt="Pawser" style="height: 32px; margin-bottom: 24px;">
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Reset your password</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        Hi ${data.name},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <a href="${data.resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">Reset Password</a>
      <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
        This link expires in ${data.expiresIn}. If you didn't request this, please ignore this email or contact support.
      </p>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      Pawser · ${new Date().getFullYear()}
    </p>
  </div>
</body>
</html>
`,

  'trial-ending': (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <img src="${process.env.APP_URL || 'https://pawser.app'}/logo.png" alt="Pawser" style="height: 32px; margin-bottom: 24px;">
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Your trial ends soon</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        Hi ${data.name},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Your trial of <strong>${data.orgName}</strong> on Pawser ends on <strong>${data.trialEndDate}</strong>.
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        To continue using all features, please add a payment method.
      </p>
      <a href="${data.billingUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">Manage Subscription</a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      Pawser · ${new Date().getFullYear()}
    </p>
  </div>
</body>
</html>
`,

  'welcome': (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <img src="${process.env.APP_URL || 'https://pawser.app'}/logo.png" alt="Pawser" style="height: 32px; margin-bottom: 24px;">
      <h1 style="color: #111827; font-size: 24px; margin: 0 0 16px;">Welcome to Pawser! 🎉</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        Hi ${data.name},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
        Thank you for joining Pawser! We're excited to help you create a beautiful adoption portal for your shelter.
      </p>
      <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">Go to Dashboard</a>
      <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 24px 0 0;">
        Need help getting started? Check out our <a href="${data.docsUrl}" style="color: #3b82f6;">documentation</a>.
      </p>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      Pawser · ${new Date().getFullYear()}
    </p>
  </div>
</body>
</html>
`,

  'sync-failed': (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <img src="${process.env.APP_URL || 'https://pawser.app'}/logo.png" alt="Pawser" style="height: 32px; margin-bottom: 24px;">
      <h1 style="color: #dc2626; font-size: 24px; margin: 0 0 16px;">⚠️ Sync Failed</h1>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        Hi ${data.name},
      </p>
      <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin: 0 0 16px;">
        The data sync for <strong>${data.orgName}</strong> has failed after multiple retries.
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 0 0 24px;">
        <p style="color: #b91c1c; font-size: 14px; line-height: 20px; margin: 0; font-family: monospace;">
          ${data.errorMessage}
        </p>
      </div>
      <a href="${data.settingsUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">Check Integration Settings</a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
      Pawser · ${new Date().getFullYear()}
    </p>
  </div>
</body>
</html>
`,
};

/**
 * Render email HTML from template and data
 */
function renderEmail(type: string, data: Record<string, unknown>): string {
  const template = emailTemplates[type];
  if (!template) {
    throw new Error(`Unknown email template: ${type}`);
  }
  return template(data);
}

/**
 * Send email via Resend API (or log in development)
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ id?: string; success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'no-reply@pawser.app';

  // In development without Resend key, just log
  if (!resendApiKey || process.env.NODE_ENV === 'development') {
    console.log(`\n📧 [Email] Would send to: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   From: ${fromEmail}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`   HTML Preview: Email template rendered successfully`);
    }
    return { success: true, id: `dev-${Date.now()}` };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to send email' };
    }

    return { success: true, id: result.id };
  } catch (error) {
    console.error('[Email] Failed to send via Resend:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Email worker processor
 */
async function processEmailJob(job: Job<EmailJob>): Promise<{ messageId?: string }> {
  const { type, to, subject, templateData, tenantId } = job.data;

  console.log(`[Email Worker] Processing job ${job.id}: ${type} to ${to}`);

  // Load tenant branding if applicable
  let branding: Record<string, unknown> = {};
  if (tenantId) {
    try {
      const settings = await prisma.organizationSettings.findUnique({
        where: { orgId: tenantId },
        select: {
          logoUrl: true,
          primaryColor: true,
        },
      });
      if (settings) {
        branding = {
          logoUrl: settings.logoUrl,
          primaryColor: settings.primaryColor,
        };
      }
    } catch (error) {
      console.warn(`[Email Worker] Failed to load tenant branding for ${tenantId}:`, error);
    }
  }

  // Render the email HTML
  const html = renderEmail(type, { ...templateData, branding });

  // Send the email
  const result = await sendEmail(to, subject, html);

  if (!result.success) {
    // Log failure to database
    try {
      await prisma.emailLog.create({
        data: {
          orgId: tenantId,
          type,
          to,
          subject,
          status: 'failed',
          error: result.error,
        },
      });
    } catch (logError) {
      console.error('[Email Worker] Failed to log email failure:', logError);
    }
    throw new Error(result.error || 'Failed to send email');
  }

  // Log success to database
  try {
    await prisma.emailLog.create({
      data: {
        orgId: tenantId,
        type,
        to,
        subject,
        messageId: result.id,
        status: 'sent',
        sentAt: new Date(),
      },
    });
  } catch (logError) {
    console.error('[Email Worker] Failed to log email success:', logError);
  }

  console.log(`[Email Worker] Successfully sent ${type} email to ${to} (messageId: ${result.id})`);

  return { messageId: result.id };
}

// Create and export the worker
export const emailWorker = new Worker<EmailJob>('email', processEmailJob, {
  connection: redisConnection,
  concurrency: 10,
});

// Event handlers
emailWorker.on('completed', (job) => {
  console.log(`[Email Worker] Job ${job.id} completed`);
});

emailWorker.on('failed', (job, error) => {
  console.error(`[Email Worker] Job ${job?.id} failed:`, error.message);
});

emailWorker.on('error', (error) => {
  console.error('[Email Worker] Worker error:', error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Email Worker] Shutting down...');
  await emailWorker.close();
  await redisConnection.quit();
});

export default emailWorker;
