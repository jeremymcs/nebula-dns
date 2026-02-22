// Nebula DNS - Subscription Plans Seed
// Seeds default subscription plan limits for development/testing
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { DataSource } from 'typeorm';
import { SubscriptionPlanLimit } from '../../modules/subscription-plans/entities/subscription-plan-limit.entity';

export interface SubscriptionPlanSeedData {
  stripePriceId: string;
  name: string;
  tier: 'home' | 'enterprise' | 'msp';
  locationLimit: number | null;
  clientLimit: number | null;
  familyMemberLimit: number;
  pricePerLocation: number | null;
  pricePerClient: number | null;
  basePrice: number;
  trialDays: number;
}

export const defaultSubscriptionPlans: SubscriptionPlanSeedData[] = [
  // Home tier plans
  {
    stripePriceId: 'price_home_basic_monthly',
    name: 'Home Basic',
    tier: 'home',
    locationLimit: 3,
    clientLimit: null,
    familyMemberLimit: 5,
    pricePerLocation: null,
    pricePerClient: null,
    basePrice: 4.99,
    trialDays: 14,
  },
  {
    stripePriceId: 'price_home_plus_monthly',
    name: 'Home Plus',
    tier: 'home',
    locationLimit: 10,
    clientLimit: null,
    familyMemberLimit: 5,
    pricePerLocation: null,
    pricePerClient: null,
    basePrice: 9.99,
    trialDays: 14,
  },

  // Enterprise tier plans
  {
    stripePriceId: 'price_enterprise_starter_monthly',
    name: 'Enterprise Starter',
    tier: 'enterprise',
    locationLimit: 25,
    clientLimit: null,
    familyMemberLimit: 0,
    pricePerLocation: null,
    pricePerClient: null,
    basePrice: 29.99,
    trialDays: 14,
  },
  {
    stripePriceId: 'price_enterprise_pro_monthly',
    name: 'Enterprise Pro',
    tier: 'enterprise',
    locationLimit: 100,
    clientLimit: null,
    familyMemberLimit: 0,
    pricePerLocation: null,
    pricePerClient: null,
    basePrice: 99.99,
    trialDays: 14,
  },

  // MSP tier plans
  {
    stripePriceId: 'price_msp_starter_monthly',
    name: 'MSP Starter',
    tier: 'msp',
    locationLimit: null,
    clientLimit: 10,
    familyMemberLimit: 0,
    pricePerLocation: null,
    pricePerClient: 15.0,
    basePrice: 199.0,
    trialDays: 14,
  },
  {
    stripePriceId: 'price_msp_pro_monthly',
    name: 'MSP Pro',
    tier: 'msp',
    locationLimit: null,
    clientLimit: 100,
    familyMemberLimit: 0,
    pricePerLocation: null,
    pricePerClient: 12.0,
    basePrice: 499.0,
    trialDays: 14,
  },
];

export async function seedSubscriptionPlans(
  dataSource: DataSource,
): Promise<void> {
  const repository = dataSource.getRepository(SubscriptionPlanLimit);

  for (const plan of defaultSubscriptionPlans) {
    const existing = await repository.findOne({
      where: { stripePriceId: plan.stripePriceId },
    });

    if (!existing) {
      const entity = repository.create({
        stripePriceId: plan.stripePriceId,
        name: plan.name,
        tier: plan.tier,
        locationLimit: plan.locationLimit,
        clientLimit: plan.clientLimit,
        familyMemberLimit: plan.familyMemberLimit,
        pricePerLocation: plan.pricePerLocation,
        pricePerClient: plan.pricePerClient,
        basePrice: plan.basePrice,
        trialDays: plan.trialDays,
        isActive: true,
      });

      await repository.save(entity);
      console.log(`Seeded subscription plan: ${plan.name}`);
    } else {
      console.log(`Subscription plan already exists: ${plan.name}`);
    }
  }
}

export async function clearSubscriptionPlans(
  dataSource: DataSource,
): Promise<void> {
  const repository = dataSource.getRepository(SubscriptionPlanLimit);
  await repository.delete({});
  console.log('Cleared all subscription plan limits');
}

// Run as standalone script
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require.main === module) {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [SubscriptionPlanLimit],
    synchronize: false,
  });

  dataSource
    .initialize()
    .then(async () => {
      await seedSubscriptionPlans(dataSource);
      await dataSource.destroy();
      console.log('Subscription plans seeded successfully');
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error('Error seeding subscription plans:', error);
      process.exit(1);
    });
}
