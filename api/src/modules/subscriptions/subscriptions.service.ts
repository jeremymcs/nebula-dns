import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { Subscription } from './entities/subscription.entity';
import { SignupRequest } from './entities/signup-request.entity';
import { CreateSignupDto } from './dto/create-signup.dto';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { Policy } from '../policies/entities/policy.entity';
import { Location } from '../locations/entities/location.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private plansRepository: Repository<SubscriptionPlan>,
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(SignupRequest)
    private signupRequestsRepository: Repository<SignupRequest>,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Policy)
    private policiesRepository: Repository<Policy>,
    @InjectRepository(Location)
    private locationsRepository: Repository<Location>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // ==================== PLANS ====================

  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.plansRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async getPlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  // ==================== SIGNUP ====================

  async createSignupRequest(dto: CreateSignupDto, ipAddress?: string, userAgent?: string): Promise<SignupRequest> {
    // Check if email already exists
    const existingUser = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('An account with this email already exists');
    }

    // Create signup request
    const signupRequest = this.signupRequestsRepository.create({
      email: dto.email,
      companyName: dto.companyName,
      planId: dto.planId,
      billingCycle: dto.billingCycle || 'monthly',
      status: 'pending',
      metadata: {
        fullName: dto.fullName,
        password: await bcrypt.hash(dto.password, 10),
        industry: dto.industry,
        companySize: dto.companySize,
        country: dto.country,
      },
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    return this.signupRequestsRepository.save(signupRequest);
  }

  async processSignup(signupRequestId: string): Promise<{ tenant: Tenant; user: User; subscription: Subscription }> {
    const signupRequest = await this.signupRequestsRepository.findOne({
      where: { id: signupRequestId },
    });

    if (!signupRequest) {
      throw new NotFoundException('Signup request not found');
    }

    if (signupRequest.status === 'completed') {
      throw new BadRequestException('Signup already completed');
    }

    if (signupRequest.expiresAt && new Date() > signupRequest.expiresAt) {
      throw new BadRequestException('Signup request has expired');
    }

    // Get the plan
    const plan = await this.getPlan(signupRequest.planId);

    // Create the tenant
    const tenant = await this.provisionTenant({
      name: signupRequest.companyName,
      email: signupRequest.email,
      fullName: signupRequest.metadata.fullName,
      passwordHash: signupRequest.metadata.password,
      plan: signupRequest.planId as any,
      industry: signupRequest.metadata.industry,
      companySize: signupRequest.metadata.companySize,
      country: signupRequest.metadata.country,
    });

    // Create subscription
    const subscription = this.subscriptionsRepository.create({
      tenantId: tenant.id,
      planId: signupRequest.planId,
      status: plan.priceMonthly === 0 ? 'active' : 'trialing',
      billingCycle: signupRequest.billingCycle,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      trialEnd: plan.priceMonthly > 0 ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null, // 14 day trial
    });

    await this.subscriptionsRepository.save(subscription);

    // Update signup request
    signupRequest.status = 'completed';
    signupRequest.tenantId = tenant.id;
    signupRequest.completedAt = new Date();
    await this.signupRequestsRepository.save(signupRequest);

    // Get the created user
    const user = await this.usersRepository.findOne({
      where: { tenantId: tenant.id, email: signupRequest.email },
    });

    // Send welcome email
    await this.emailService.sendWelcomeEmail({
      to: signupRequest.email,
      name: signupRequest.metadata.fullName,
      companyName: signupRequest.companyName,
      planName: plan.name,
      loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
    });

    return { tenant, user, subscription };
  }

  // ==================== PROVISIONING ====================

  async provisionTenant(data: {
    name: string;
    email: string;
    fullName: string;
    passwordHash: string;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    industry?: string;
    companySize?: string;
    country?: string;
  }): Promise<Tenant> {
    // Generate a unique slug
    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.tenantsRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create tenant
    const tenant = this.tenantsRepository.create({
      name: data.name,
      slug,
      status: 'active',
      plan: data.plan,
      settings: {
        timezone: 'UTC',
        blockPageEnabled: true,
      },
    });

    // Add optional fields if the entity supports them
    if (data.industry) (tenant as any).industry = data.industry;
    if (data.companySize) (tenant as any).companySize = data.companySize;
    if (data.country) (tenant as any).country = data.country;
    (tenant as any).billingEmail = data.email;

    await this.tenantsRepository.save(tenant);

    // Create owner user
    const user = this.usersRepository.create({
      tenantId: tenant.id,
      email: data.email,
      name: data.fullName,
      passwordHash: data.passwordHash,
      role: 'owner',
      status: 'active',
    });

    await this.usersRepository.save(user);

    // Create default policy
    const policy = this.policiesRepository.create({
      tenantId: tenant.id,
      name: 'Default Security Policy',
      description: 'Automatically created security policy with recommended settings',
      currentVersion: 1,
      isDefault: true,
    });

    await this.policiesRepository.save(policy);

    // Create default location
    const location = this.locationsRepository.create({
      tenantId: tenant.id,
      name: 'Primary Network',
      description: 'Your primary network location',
      status: 'active',
      policyId: policy.id,
      settings: {
        blockResponse: 'nxdomain',
      },
    });

    await this.locationsRepository.save(location);

    return tenant;
  }

  // ==================== STRIPE WEBHOOK HANDLING ====================

  async handleStripeWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
    }
  }

  private async handleCheckoutCompleted(session: any): Promise<void> {
    const signupRequest = await this.signupRequestsRepository.findOne({
      where: { stripeCheckoutSessionId: session.id },
    });

    if (signupRequest && signupRequest.status !== 'completed') {
      await this.processSignup(signupRequest.id);
    }
  }

  private async handleSubscriptionUpdated(stripeSubscription: any): Promise<void> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = this.mapStripeStatus(stripeSubscription.status);
      subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      await this.subscriptionsRepository.save(subscription);
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: any): Promise<void> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (subscription) {
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      await this.subscriptionsRepository.save(subscription);

      // Downgrade tenant to free plan
      await this.tenantsRepository.update(subscription.tenantId, { plan: 'free' });
    }
  }

  private async handleInvoicePaid(invoice: any): Promise<void> {
    // Log the payment or update invoice records
    console.log('Invoice paid:', invoice.id);
  }

  private async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    const subscription = await this.subscriptionsRepository.findOne({
      where: { stripeCustomerId: invoice.customer },
    });

    if (subscription) {
      subscription.status = 'past_due';
      await this.subscriptionsRepository.save(subscription);

      // Send payment failed email
      const tenant = await this.tenantsRepository.findOne({ where: { id: subscription.tenantId } });
      if (tenant) {
        await this.emailService.sendPaymentFailedEmail({
          to: (tenant as any).billingEmail || '',
          companyName: tenant.name,
          updatePaymentUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/settings/billing`,
        });
      }
    }
  }

  private mapStripeStatus(stripeStatus: string): 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused' {
    const statusMap: Record<string, any> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      trialing: 'trialing',
      paused: 'paused',
      unpaid: 'past_due',
    };
    return statusMap[stripeStatus] || 'active';
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  async getSubscription(tenantId: string): Promise<Subscription> {
    return this.subscriptionsRepository.findOne({
      where: { tenantId },
      relations: ['plan'],
    });
  }

  async cancelSubscription(tenantId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.cancelAtPeriodEnd = true;
    return this.subscriptionsRepository.save(subscription);
  }

  async resumeSubscription(tenantId: string): Promise<Subscription> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.cancelAtPeriodEnd = false;
    return this.subscriptionsRepository.save(subscription);
  }
}
