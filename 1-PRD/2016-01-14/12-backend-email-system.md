# Email System

> **Type:** Backend PRD  
> **Feature:** Transactional Email Infrastructure  
> **Priority:** P1 (Important)  
> **Status:** 🟡 Scaffolded  
> **Depends On:** None (foundational)
>
> **Implementation Notes:**
> - ✅ EmailService created at `apps/api/src/services/EmailService.ts`
> - ✅ Email worker created at `apps/api/src/jobs/email-worker.ts`
> - ✅ BullMQ queue setup for async delivery
> - 🟡 React Email templates need creation
> - 🟡 Resend integration needs testing
> - 🟡 Magic link emails need testing
> - 🟡 Invitation emails need testing

---

## Feature Overview

Implement a robust transactional email system using Resend as the email provider. Supports magic link authentication, team invitations, password resets, and notification emails. Uses React Email for templating with consistent branding, and BullMQ for reliable async delivery with retry logic.

## Requirements

### Email Provider

**Primary:** Resend
- API-based delivery
- React Email template support
- Delivery analytics and webhooks
- High deliverability rates

**Configuration:**
```env
RESEND_API_KEY=re_xxxx
EMAIL_FROM=no-reply@pawser.app
EMAIL_REPLY_TO=support@pawser.app
```

### Email Types

| Type | Trigger | TTL | Priority |
|------|---------|-----|----------|
| Magic Link | Login/signup request | 15 min | High |
| Invitation | Team member invite | 7 days | High |
| Password Reset | Forgot password | 1 hour | High |
| Trial Ending | 3 days before trial end | N/A | Normal |
| Welcome | First login | N/A | Normal |
| Sync Failed | Sync error after 3 retries | N/A | Normal |

### Template Structure

All emails share:
- Pawser logo header (or tenant logo for white-label)
- Primary CTA button
- Footer with unsubscribe/contact links
- Mobile-responsive design

### Email Templates

#### Magic Link Email
```
Subject: Sign in to Pawser
---
Hi {name or "there"},

Click the button below to sign in to your account.
This link expires in 15 minutes.

[Sign In] → {magicLinkUrl}

If you didn't request this, you can safely ignore this email.

---
Pawser | {year}
```

#### Invitation Email
```
Subject: You've been invited to join {orgName} on Pawser
---
Hi,

{inviterName} has invited you to join {orgName} as a {role}.

[Accept Invitation] → {invitationUrl}

This invitation expires in 7 days.

---
Pawser | {year}
```

#### Password Reset Email
```
Subject: Reset your Pawser password
---
Hi {name},

We received a request to reset your password.
Click the button below to create a new password.

[Reset Password] → {resetUrl}

This link expires in 1 hour.

If you didn't request this, please ignore this email or contact support.

---
Pawser | {year}
```

#### Trial Ending Email
```
Subject: Your Pawser trial ends in 3 days
---
Hi {name},

Your trial of {orgName} on Pawser ends on {trialEndDate}.

To continue using all features, please add a payment method.

[Manage Subscription] → {billingUrl}

Current plan features:
- {syncInterval} minute sync interval
- {feature2}
- {feature3}

---
Pawser | {year}
```

### Queue Architecture

**BullMQ Queue:** `email`

**Job data:**
```typescript
interface EmailJob {
  type: 'magic-link' | 'invitation' | 'password-reset' | 'trial-ending' | 'welcome' | 'sync-failed';
  to: string;
  subject: string;
  templateData: Record<string, any>;
  tenantId?: string;  // For white-label branding
  priority?: 'high' | 'normal';
}
```

**Queue configuration:**
```typescript
{
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,  // 1s, 2s, 4s
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
}
```

### API Endpoints

```
POST /api/v1/internal/email/send
     Body: EmailJob
     Response: { jobId: string }
     Auth: Internal API key only

GET  /api/v1/internal/email/status/:jobId
     Response: { status: 'pending' | 'completed' | 'failed', error?: string }
```

### Service Implementation

```typescript
// apps/api/src/services/EmailService.ts

import { Resend } from 'resend';
import { emailQueue } from '../jobs/queues';

class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendMagicLink(email: string, token: string, name?: string): Promise<string> {
    const job = await emailQueue.add('email', {
      type: 'magic-link',
      to: email,
      subject: 'Sign in to Pawser',
      templateData: {
        name,
        magicLinkUrl: `${process.env.APP_URL}/auth/magic?token=${token}`,
        expiresIn: '15 minutes',
      },
      priority: 'high',
    });
    return job.id;
  }

  async sendInvitation(
    email: string,
    inviterName: string,
    orgName: string,
    role: string,
    token: string
  ): Promise<string> {
    const job = await emailQueue.add('email', {
      type: 'invitation',
      to: email,
      subject: `You've been invited to join ${orgName} on Pawser`,
      templateData: {
        inviterName,
        orgName,
        role,
        invitationUrl: `${process.env.APP_URL}/invite/accept?token=${token}`,
      },
      priority: 'high',
    });
    return job.id;
  }

  async sendPasswordReset(email: string, name: string, token: string): Promise<string> {
    const job = await emailQueue.add('email', {
      type: 'password-reset',
      to: email,
      subject: 'Reset your Pawser password',
      templateData: {
        name,
        resetUrl: `${process.env.APP_URL}/auth/reset-password?token=${token}`,
        expiresIn: '1 hour',
      },
      priority: 'high',
    });
    return job.id;
  }

  async sendTrialEnding(
    email: string,
    name: string,
    orgName: string,
    trialEndDate: Date
  ): Promise<string> {
    const job = await emailQueue.add('email', {
      type: 'trial-ending',
      to: email,
      subject: 'Your Pawser trial ends in 3 days',
      templateData: {
        name,
        orgName,
        trialEndDate: trialEndDate.toLocaleDateString(),
        billingUrl: `${process.env.ADMIN_URL}/billing`,
      },
    });
    return job.id;
  }
}
```

### Worker Implementation

```typescript
// apps/api/src/jobs/email-worker.ts

import { Worker } from 'bullmq';
import { Resend } from 'resend';
import { renderTemplate } from '../email/templates';

const resend = new Resend(process.env.RESEND_API_KEY);

const emailWorker = new Worker('email', async (job) => {
  const { type, to, subject, templateData, tenantId } = job.data;

  // Load tenant branding if applicable
  let branding = null;
  if (tenantId) {
    branding = await loadTenantBranding(tenantId);
  }

  // Render React Email template
  const html = await renderTemplate(type, {
    ...templateData,
    branding,
  });

  // Send via Resend
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { messageId: result.data?.id };
}, {
  connection: redisConnection,
  concurrency: 10,
});
```

### React Email Templates

```typescript
// packages/shared/src/email/templates/MagicLink.tsx

import {
  Html, Head, Body, Container, Section,
  Text, Button, Link, Hr, Img
} from '@react-email/components';

interface MagicLinkEmailProps {
  name?: string;
  magicLinkUrl: string;
  expiresIn: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
  };
}

export function MagicLinkEmail({
  name,
  magicLinkUrl,
  expiresIn,
  branding,
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Img
            src={branding?.logoUrl || 'https://pawser.app/logo.png'}
            width="120"
            height="40"
            alt="Pawser"
          />
          <Section style={section}>
            <Text style={heading}>Sign in to Pawser</Text>
            <Text style={text}>
              Hi {name || 'there'},
            </Text>
            <Text style={text}>
              Click the button below to sign in to your account.
              This link expires in {expiresIn}.
            </Text>
            <Button
              style={{
                ...button,
                backgroundColor: branding?.primaryColor || '#3B82F6',
              }}
              href={magicLinkUrl}
            >
              Sign In
            </Button>
            <Text style={textMuted}>
              If you didn't request this, you can safely ignore this email.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Pawser · {new Date().getFullYear()}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Webhook Handling (Optional)

Resend webhooks for delivery tracking:

```
POST /api/v1/webhooks/resend
     Events: delivered, bounced, complained
     Action: Update email delivery status, alert on bounces
```

### Database Schema

```prisma
model EmailLog {
  id          String   @id @default(uuid())
  orgId       String?
  type        String   // magic-link, invitation, etc.
  to          String
  subject     String
  messageId   String?  // Resend message ID
  status      String   @default("pending") // pending, sent, delivered, failed, bounced
  error       String?
  sentAt      DateTime?
  deliveredAt DateTime?
  createdAt   DateTime @default(now())
  
  organization Organization? @relation(fields: [orgId], references: [id])
  
  @@index([orgId])
  @@index([to])
  @@index([type])
  @@index([status])
}
```

## User Stories

1. As a user, I receive a magic link email within seconds of requesting it.
2. As a team member, I receive a clear invitation email explaining who invited me.
3. As a user, I can reset my password via email if I forget it.
4. As an owner, I receive a warning email before my trial expires.
5. As an admin, I can see email delivery status for debugging.

## Technical Considerations

- **Rate limiting:** Max 100 emails/minute per tenant to prevent abuse
- **Unsubscribe:** Provide one-click unsubscribe for non-transactional emails
- **Retry logic:** Exponential backoff for failed deliveries
- **Bounce handling:** Track hard bounces, disable sending after 3 bounces
- **SPF/DKIM:** Configured at domain level for deliverability
- **Email preview:** Admin can preview templates with test data
- **Logging:** All emails logged for debugging and compliance

## Success Criteria

| Metric | Target |
|--------|--------|
| Delivery rate | ≥ 99% |
| Time to inbox | < 30 seconds for high priority |
| Bounce rate | < 2% |
| Spam complaint rate | < 0.1% |
| Queue processing | 99.9% jobs completed |
| Worker uptime | 99.9% |
