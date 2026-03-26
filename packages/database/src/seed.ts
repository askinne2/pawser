import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default plans
  const plans = [
    {
      code: 'trial',
      name: 'Trial',
      description: '14-day free trial with full features',
      syncIntervalSeconds: 1800, // 30 minutes
      maxAdmins: 2,
      priceCents: 0,
    },
    {
      code: 'basic',
      name: 'Basic',
      description: 'Perfect for small shelters',
      syncIntervalSeconds: 900, // 15 minutes
      maxAdmins: 2,
      priceCents: 4900, // $49
    },
    {
      code: 'pro',
      name: 'Pro',
      description: 'For growing organizations',
      syncIntervalSeconds: 300, // 5 minutes
      maxAdmins: 5,
      priceCents: 9900, // $99
    },
    {
      code: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with custom needs',
      syncIntervalSeconds: 120, // 2 minutes
      maxAdmins: -1, // unlimited
      priceCents: 24900, // $249
    },
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findUnique({
      where: { code: plan.code },
    });

    if (!existing) {
      await prisma.plan.create({ data: plan });
      console.log(`✅ Created plan: ${plan.name}`);
    } else {
      console.log(`✅ Plan ${plan.name} already exists`);
    }
  }

  // Create super admin user
  const email = 'andrew@21adsmedia.com';
  const password = 'merrimack1';

  // Hash password with bcrypt
  const passwordHash = await bcrypt.hash(password, 10);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { passwordCredential: true },
  });

  let superAdminId: string;

  if (existingUser) {
    console.log(`✅ User ${email} already exists`);
    superAdminId = existingUser.id;
    
    // Always ensure password credential exists and is up to date
    if (existingUser.passwordCredential) {
      // Update existing password
      await prisma.passwordCredential.update({
        where: { userId: existingUser.id },
        data: { passwordHash },
      });
      console.log(`   Updated password credential`);
    } else {
      // Create missing password credential
      await prisma.passwordCredential.create({
        data: {
          userId: existingUser.id,
          passwordHash,
        },
      });
      console.log(`   Created missing password credential`);
    }
  } else {
    // Create super admin user
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Andrew Skinner',
        isSuperAdmin: true,
      },
    });

    // Create password credential
    await prisma.passwordCredential.create({
      data: {
        userId: user.id,
        passwordHash,
      },
    });

    console.log(`✅ Created super admin user: ${email}`);
    console.log(`   User ID: ${user.id}`);
    superAdminId = user.id;
  }

  // Create a sample organization for testing
  const orgSlug = 'demo-shelter';
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!existingOrg) {
    // Get the trial plan
    const trialPlan = await prisma.plan.findUnique({
      where: { code: 'trial' },
    });

    // Create organization
    const org = await prisma.organization.create({
      data: {
        slug: orgSlug,
        name: 'Demo Animal Shelter',
        status: 'active',
        primaryColor: '#6366f1', // Indigo
      },
    });

    // Create domain mapping (subdomain)
    await prisma.domainMapping.create({
      data: {
        orgId: org.id,
        domain: 'demo.pawser.app',
        isPrimary: true,
        verificationStatus: 'verified',
        sslStatus: 'active',
        verifiedAt: new Date(),
      },
    });

    // Create membership for super admin as owner
    await prisma.membership.create({
      data: {
        orgId: org.id,
        userId: superAdminId,
        role: 'owner',
        acceptedAt: new Date(),
      },
    });

    // Create subscription on trial plan
    if (trialPlan) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

      await prisma.subscription.create({
        data: {
          orgId: org.id,
          planId: trialPlan.id,
          status: 'trialing',
          trialEnd,
        },
      });
    }

    console.log(`✅ Created demo organization: ${org.name}`);
    console.log(`   Organization ID: ${org.id}`);
    console.log(`   Domain: demo.pawser.app`);
    console.log(`   Access at: http://demo.localhost:3000 (when portal is running)`);
  } else {
    console.log(`✅ Demo organization already exists`);
  }

  console.log('✨ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
