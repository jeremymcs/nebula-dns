// Nebula DNS - Authentication Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService, LoginContext } from './auth.service';
import {
  LoginDto,
  LoginResponseDto,
  MfaVerifyLoginDto,
  MfaRequiredResponseDto,
} from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  CurrentUser,
  CurrentTenant,
} from '@/common/decorators/tenant.decorator';

/**
 * Extended user payload with JTI
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  jti?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user and get tokens',
    description:
      'Authenticates a user with email and password. Returns JWT access and refresh tokens on success. If MFA is enabled, returns a temporary token that must be verified with the /auth/mfa/verify endpoint.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful - returns access and refresh tokens, or MFA required response',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials - email or password is incorrect',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts - account temporarily locked',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<LoginResponseDto | MfaRequiredResponseDto> {
    const context: LoginContext = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: this.getClientIp(req, ip),
    };
    return this.authService.login(loginDto, context);
  }

  /**
   * Extract client IP from request, handling proxies
   */
  private getClientIp(req: Request, defaultIp: string): string {
    // Check for forwarded headers (when behind proxy/load balancer)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return ips.trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return defaultIp || req.ip || '0.0.0.0';
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify MFA code and complete login',
    description:
      'Completes the login process by verifying the MFA code. Use the temporary token from the login response along with either a TOTP code from your authenticator app or a backup code.',
  })
  @ApiResponse({
    status: 200,
    description:
      'MFA verified successfully - returns access and refresh tokens',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid MFA code or expired temporary token',
  })
  async verifyMfa(@Body() dto: MfaVerifyLoginDto): Promise<LoginResponseDto> {
    return this.authService.verifyMfaLogin(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for new access and refresh tokens. Use this to maintain user sessions without requiring re-authentication. The old refresh token is invalidated.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Token refreshed successfully - returns new access and refresh tokens',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<LoginResponseDto> {
    const context: LoginContext = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: this.getClientIp(req, ip),
    };
    return this.authService.refreshToken(refreshDto.refreshToken, context);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      mfaEnabled: user.mfaEnabled || false,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and invalidate tokens' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logout(user.id, user.jti);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 204, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid current password' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, changePasswordDto);
  }

  @Get('organizations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get managed organizations for MSP users' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getManagedOrganizations(
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.authService.getManagedOrganizations(user.id, tenantId);
  }

  @Post('switch-tenant')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Switch to a different organization (MSP users only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Switched successfully, new tokens returned',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to switch to this organization',
  })
  async switchTenant(
    @CurrentUser() user: any,
    @CurrentTenant() currentTenantId: string,
    @Body() dto: SwitchTenantDto,
  ): Promise<LoginResponseDto> {
    return this.authService.switchTenant(
      user.id,
      currentTenantId,
      dto.tenantId,
    );
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active sessions for current user' })
  @ApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              device: { type: 'string' },
              browser: { type: 'string' },
              os: { type: 'string' },
              location: { type: 'string' },
              ipAddress: { type: 'string' },
              lastActive: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              isCurrent: { type: 'boolean' },
            },
          },
        },
      },
    },
  })
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getSessions(user.id, user.jti);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 204, description: 'Session revoked successfully' })
  @ApiResponse({ status: 400, description: 'Cannot revoke current session' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ): Promise<void> {
    await this.authService.revokeSession(user.id, sessionId, user.jti);
  }

  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiResponse({
    status: 200,
    description: 'All other sessions revoked',
    schema: {
      type: 'object',
      properties: {
        revokedCount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async revokeAllSessions(@CurrentUser() user: AuthenticatedUser) {
    const revokedCount = await this.authService.revokeAllSessions(
      user.id,
      user.jti,
    );
    return {
      revokedCount,
      message: `Successfully revoked ${revokedCount} session(s)`,
    };
  }
}
