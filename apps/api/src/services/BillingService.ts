import { prisma } from '@pawser/database';

/**
 * Billing Service - Stub implementation for Stripe integration
 * 
 * This service provides subscription management, payment processing,
 * and billing-related operations. Currently a stub with placeholder logic.
 */
export class BillingService {
  private readonly stripeSecretKey: string;
  private readonly stripePriceIds: Record<string, string>;

  constructor() {
    this.stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
    this.stripePriceIds = {
      trial: '', // Free trial, no Stripe price
      basic: process.env.STRIPE_PRICE_BASIC || 'price_basic_monthly',
      pro: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly',
    };
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured(): boolean {
    return !!this.stripeSecretKey;
  }

  /**
   * Create a Stripe customer for an organization
   */
  async createCustomer(
    orgId: string,
    email: string,
    name: string
  ): Promise<{ customerId: string | null; error?: string }> {
    if (!this.isConfigured()) {
      console.warn('Stripe not configured, skipping customer creation');
      return { customerId: null, error: 'Stripe not configured' };
    }

    try {
      // STUB: In production, use Stripe SDK
      // const stripe = new Stripe(this.stripeSecretKey);
      // const customer = await stripe.customers.create({
      //   email,
      //   name,
      //   metadata: { orgId },
      // });
      // return { customerId: customer.id };

      const stubCustomerId = `cus_stub_${orgId.slice(0, 8)}`;
      console.log(`[STUB] Created Stripe customer: ${stubCustomerId}`);

      // Update organization with customer ID
      await prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: stubCustomerId },
      });

      return { customerId: stubCustomerId };
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      return {
        customerId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a checkout session for subscription upgrade
   */
  async createCheckoutSession(
    orgId: string,
    planCode: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string | null; url: string | null; error?: string }> {
    if (!this.isConfigured()) {
      return { sessionId: null, url: null, error: 'Stripe not configured' };
    }

    try {
      // Get organization and plan
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!org) {
        return { sessionId: null, url: null, error: 'Organization not found' };
      }

      const plan = await prisma.plan.findUnique({
        where: { code: planCode },
      });

      if (!plan || !plan.isActive) {
        return { sessionId: null, url: null, error: 'Invalid plan' };
      }

      // STUB: In production, create actual Stripe checkout session
      // const stripe = new Stripe(this.stripeSecretKey);
      // const session = await stripe.checkout.sessions.create({
      //   customer: org.stripeCustomerId,
      //   mode: 'subscription',
      //   line_items: [{ price: this.stripePriceIds[planCode], quantity: 1 }],
      //   success_url: successUrl,
      //   cancel_url: cancelUrl,
      //   metadata: { orgId },
      // });

      const stubSessionId = `cs_stub_${Date.now()}`;
      console.log(`[STUB] Created checkout session: ${stubSessionId}`);

      return {
        sessionId: stubSessionId,
        url: `https://checkout.stripe.com/stub/${stubSessionId}`,
      };
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      return {
        sessionId: null,
        url: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a billing portal session for managing subscription
   */
  async createPortalSession(
    orgId: string,
    returnUrl: string
  ): Promise<{ url: string | null; error?: string }> {
    if (!this.isConfigured()) {
      return { url: null, error: 'Stripe not configured' };
    }

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!org?.stripeCustomerId) {
        return { url: null, error: 'No Stripe customer ID for organization' };
      }

      // STUB: In production, create actual Stripe portal session
      // const stripe = new Stripe(this.stripeSecretKey);
      // const session = await stripe.billingPortal.sessions.create({
      //   customer: org.stripeCustomerId,
      //   return_url: returnUrl,
      // });

      console.log(`[STUB] Created billing portal session for ${org.stripeCustomerId}`);

      return {
        url: `https://billing.stripe.com/stub/${org.stripeCustomerId}`,
      };
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      return {
        url: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get subscription details for an organization
   */
  async getSubscription(orgId: string): Promise<{
    subscription: {
      id: string;
      planCode: string;
      planName: string;
      status: string;
      trialEnd: Date | null;
      currentPeriodEnd: Date | null;
      cancelAt: Date | null;
    } | null;
    error?: string;
  }> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { orgId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        return { subscription: null, error: 'No subscription found' };
      }

      return {
        subscription: {
          id: subscription.id,
          planCode: subscription.plan.code,
          planName: subscription.plan.name,
          status: subscription.status,
          trialEnd: subscription.trialEnd,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAt: subscription.cancelAt,
        },
      };
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return {
        subscription: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get invoices for an organization
   */
  async getInvoices(
    orgId: string,
    limit = 10
  ): Promise<{
    invoices: Array<{
      id: string;
      stripeInvoiceId: string;
      status: string;
      amountDueCents: number;
      amountPaidCents: number;
      periodStart: Date | null;
      periodEnd: Date | null;
      hostedInvoiceUrl: string | null;
      createdAt: Date;
    }>;
    error?: string;
  }> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return {
        invoices: invoices.map((inv) => ({
          id: inv.id,
          stripeInvoiceId: inv.stripeInvoiceId,
          status: inv.status,
          amountDueCents: inv.amountDueCents,
          amountPaidCents: inv.amountPaidCents,
          periodStart: inv.periodStart,
          periodEnd: inv.periodEnd,
          hostedInvoiceUrl: inv.hostedInvoiceUrl,
          createdAt: inv.createdAt,
        })),
      };
    } catch (error) {
      console.error('Failed to get invoices:', error);
      return {
        invoices: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhookEvent(
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`[STUB] Processing Stripe webhook: ${eventType}`);

    try {
      switch (eventType) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          // Handle subscription created/updated
          await this.handleSubscriptionUpdate(eventData);
          break;

        case 'customer.subscription.deleted':
          // Handle subscription canceled
          await this.handleSubscriptionDeleted(eventData);
          break;

        case 'invoice.paid':
          // Handle invoice paid
          await this.handleInvoicePaid(eventData);
          break;

        case 'invoice.payment_failed':
          // Handle payment failure
          await this.handlePaymentFailed(eventData);
          break;

        default:
          console.log(`Unhandled webhook event type: ${eventType}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Failed to handle webhook ${eventType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle subscription update webhook
   */
  private async handleSubscriptionUpdate(data: Record<string, unknown>): Promise<void> {
    // STUB: Extract subscription data and update database
    console.log('[STUB] Handling subscription update:', data);
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(data: Record<string, unknown>): Promise<void> {
    // STUB: Mark subscription as canceled
    console.log('[STUB] Handling subscription deleted:', data);
  }

  /**
   * Handle invoice paid webhook
   */
  private async handleInvoicePaid(data: Record<string, unknown>): Promise<void> {
    // STUB: Record invoice payment
    console.log('[STUB] Handling invoice paid:', data);
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(data: Record<string, unknown>): Promise<void> {
    // STUB: Update subscription status to past_due
    console.log('[STUB] Handling payment failed:', data);
  }
}

// Singleton instance
let billingService: BillingService | null = null;

export function getBillingService(): BillingService {
  if (!billingService) {
    billingService = new BillingService();
  }
  return billingService;
}

export default getBillingService;
