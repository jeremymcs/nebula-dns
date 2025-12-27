import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PartnersService } from './partners.service';
import { PartnerLoginDto } from './dto/partner.dto';

@Controller('partner-auth')
export class PartnerAuthController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: PartnerLoginDto) {
    // Validate credentials
    const user = await this.partnersService.validatePartnerUser(dto.email, dto.password);

    // Check if MFA is required
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        return {
          requireMfa: true,
          message: 'MFA code required',
        };
      }
      // TODO: Validate MFA code
      // For now, we'll skip MFA validation
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
  async refresh(@Body() body: { token: string }) {
    try {
      const decoded = this.jwtService.verify(body.token);
      
      if (decoded.type !== 'partner') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Fetch fresh user data
      const user = await this.partnersService.findUserById(decoded.partnerId, decoded.sub);
      
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
  async forgotPassword(@Body() body: { email: string }) {
    // TODO: Implement password reset flow
    // For now, just return success to avoid email enumeration
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }
}

