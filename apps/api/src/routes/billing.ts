import { Router, Request, Response } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { getBillingService } from '../services/BillingService';
import { prisma } from '@pawser/database';
import { ErrorCodes } from '@pawser/shared';

const router = Router();
const billingService = getBillingService();

/**
 * GET /v1/billing/plans
 * Get available subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        priceCents: true,
        syncIntervalSeconds: true,
        maxAdmins: true,
      },
    });

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Failed to get plans:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve plans',
      },
    });
  }
});

/**
 * GET /v1/billing/subscription
 * Get current subscription for the authenticated user's organization
 */
router.get(
  '/subscription',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.tenant?.organizationId;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Organization context required',
          },
        });
      }

      const result = await billingService.getSubscription(orgId);

      if (result.error && !result.subscription) {
        return res.status(404).json({
          success: false,
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: result.error,
          },
        });
      }

      return res.json({
        success: true,
        data: result.subscription,
      });
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve subscription',
        },
      });
    }
  }
);

/**
 * POST /v1/billing/checkout
 * Create a Stripe checkout session for subscription upgrade
 */
router.post(
  '/checkout',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.tenant?.organizationId;
      const { planCode, successUrl, cancelUrl } = req.body;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Organization context required',
          },
        });
      }

      if (!planCode || !successUrl || !cancelUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'planCode, successUrl, and cancelUrl are required',
          },
        });
      }

      const result = await billingService.createCheckoutSession(
        orgId,
        planCode,
        successUrl,
        cancelUrl
      );

      if (result.error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CHECKOUT_FAILED',
            message: result.error,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          sessionId: result.sessionId,
          url: result.url,
        },
      });
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create checkout session',
        },
      });
    }
  }
);

/**
 * POST /v1/billing/portal
 * Create a Stripe billing portal session
 */
router.post(
  '/portal',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.tenant?.organizationId;
      const { returnUrl } = req.body;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Organization context required',
          },
        });
      }

      if (!returnUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'returnUrl is required',
          },
        });
      }

      const result = await billingService.createPortalSession(orgId, returnUrl);

      if (result.error) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PORTAL_FAILED',
            message: result.error,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          url: result.url,
        },
      });
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create billing portal session',
        },
      });
    }
  }
);

/**
 * GET /v1/billing/invoices
 * Get invoices for the organization
 */
router.get(
  '/invoices',
  authenticate,
  requireRole('owner', 'admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.tenant?.organizationId;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!orgId) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message: 'Organization context required',
          },
        });
      }

      const result = await billingService.getInvoices(orgId, limit);

      return res.json({
        success: true,
        data: result.invoices,
      });
    } catch (error) {
      console.error('Failed to get invoices:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve invoices',
        },
      });
    }
  }
);

/**
 * POST /v1/billing/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // In production, verify webhook signature
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (!sig || !webhookSecret) {
      console.warn('Stripe webhook received without signature verification');
    }

    const event = req.body;
    const eventType = event.type as string;
    const eventData = event.data?.object || {};

    // Store webhook event
    await prisma.webhookEvent.create({
      data: {
        provider: 'stripe',
        eventType,
        externalId: event.id || `stripe_${Date.now()}`,
        payload: event,
        status: 'pending',
      },
    });

    // Process webhook
    const result = await billingService.handleWebhookEvent(eventType, eventData);

    if (!result.success) {
      // Log error but still return 200 to prevent Stripe retries
      console.error('Webhook processing failed:', result.error);
    }

    // Update webhook event status
    await prisma.webhookEvent.updateMany({
      where: { externalId: event.id },
      data: {
        processedAt: new Date(),
        status: result.success ? 'processed' : 'failed',
        error: result.error,
      },
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook error',
    });
  }
});

export default router;
