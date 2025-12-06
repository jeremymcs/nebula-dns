import { IsEmail, IsString, IsNotEmpty, IsIn, IsOptional, MinLength } from 'class-validator';

export class CreateSignupDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsIn(['free', 'starter', 'pro', 'enterprise'])
  planId: string;

  @IsString()
  @IsIn(['monthly', 'yearly'])
  @IsOptional()
  billingCycle?: 'monthly' | 'yearly' = 'monthly';

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  companySize?: string;

  @IsString()
  @IsOptional()
  country?: string;
}

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  signupRequestId: string;

  @IsString()
  @IsOptional()
  successUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;
}
