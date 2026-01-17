// Nebula DNS - Partner Auth Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PartnersService } from './partners.service';
import { PartnerLoginDto } from './dto/partner.dto';
import { EmailService } from '../email/email.service';

@ApiTags('partner-auth')
@Controller('partner-auth')
export class PartnerAuthController {
  private readonly partnerPortalUrl: string;

  constructor(
    private readonly partnersService: PartnersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.partnerPortalUrl = this.configService.get(
      'PARTNER_PORTAL_URL',
      'http://localhost:3001',
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Partner user login',
    description:
      'Authenticates a partner user with email and password. Returns JWT token on success. If MFA is enabled, requires mfaCode.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access token',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials or MFA code' })
  async login(@Body() dto: PartnerLoginDto) {
    // Validate credentials
    const user = await this.partnersService.validatePartnerUser(
      dto.email,
      dto.password,
    );

    // Check if MFA is required
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return {
          requireMfa: true,
          message: 'MFA code required',
        };
      }
      // Validate MFA code
      const isValidMfa = await this.partnersService.verifyPartnerMfaCode(
        user.id,
        dto.mfaCode,
      );
      if (!isValidMfa) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Get partner info
    const partner = await this.partnersService.findOne(user.partnerId);

    // Generate JWT token with partner context
    const payload = {
      sub: user.id,
      email: user.email,
      partnerId: user.partnerId,
      role: user.role,
      type: 'partner', // Distinguish from regular user tokens
    };

    const token = this.jwtService.sign(payload, { expiresIn: '24h' });

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400, // 24 hours in seconds
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      partner: {
        id: partner.id,
        name: partner.name,
        slug: partner.slug,
        plan: partner.plan,
        branding: partner.branding,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh partner access token',
    description:
      'Exchanges a valid JWT token for a new one with extended expiry.',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async refresh(@Body() body: { token: string }) {
    try {
      const decoded = this.jwtService.verify(body.token);

      if (decoded.type !== 'partner') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Fetch fresh user data
      const user = await this.partnersService.findUserById(
        decoded.partnerId,
        decoded.sub,
      );

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new token
      const payload = {
        sub: user.id,
        email: user.email,
        partnerId: user.partnerId,
        role: user.role,
        type: 'partner',
      };

      const token = this.jwtService.sign(payload, { expiresIn: '24h' });

      return {
        access_token: token,
        token_type: 'Bearer',
        expires_in: 86400,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset email if the account exists. Always returns success to prevent email enumeration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
  })
  @ApiResponse({ status: 400, description: 'Email is required' })
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }

    // Generate password reset token
    const result = await this.partnersService.generatePasswordResetToken(
      body.email,
    );

    // If user exists, send reset email
    if (result) {
      const resetUrl = `${this.partnerPortalUrl}/reset-password?token=${result.token}`;
      await this.emailService.sendPasswordResetEmail({
        to: result.user.email,
        name: result.user.name,
        resetUrl,
      });
    }

    // Always return success to avoid email enumeration
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets the password using a valid reset token from the email. Token expires after 1 hour.',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid token, password too short, or missing fields',
  })
  async resetPassword(@Body() body: { token: string; password: string }) {
    if (!body.token || !body.password) {
      throw new BadRequestException('Token and password are required');
    }

    if (body.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    await this.partnersService.resetPassword(body.token, body.password);

    return {
      message:
        'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  @Post('validate-reset-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate password reset token',
    description:
      'Checks if a password reset token is valid and not expired. Returns partially masked email if valid.',
  })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  @ApiResponse({ status: 400, description: 'Token is required' })
  async validateResetToken(@Body() body: { token: string }) {
    if (!body.token) {
      throw new BadRequestException('Token is required');
    }

    const user = await this.partnersService.validatePasswordResetToken(
      body.token,
    );

    return {
      valid: !!user,
      email: user?.email
        ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        : null, // Partially mask email
    };
  }
}
