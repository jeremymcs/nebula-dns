// Nebula DNS - MFA Controller
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { VerifyMfaDto, DisableMfaDto } from './dto/mfa.dto';

@ApiTags('mfa')
@ApiBearerAuth()
@Controller('mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get MFA status',
    description:
      'Returns the current MFA status for the authenticated user, including whether MFA is enabled and remaining backup codes.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA status retrieved',
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', example: true },
        backupCodes: { type: 'number', example: 8, nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getMfaStatus(@CurrentUser() user: any) {
    const isEnabled = await this.mfaService.isMfaEnabled(user.id);
    const backupCodes = isEnabled
      ? await this.mfaService.getBackupCodesCount(user.id)
      : null;

    return {
      enabled: isEnabled,
      backupCodes,
    };
  }

  @Post('setup')
  @ApiOperation({
    summary: 'Start MFA setup',
    description:
      'Initiates MFA setup by generating a TOTP secret and QR code. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.) and then verify with the /mfa/verify endpoint.',
  })
  @ApiResponse({
    status: 201,
    description: 'MFA setup initiated - returns secret and QR code',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            secret: { type: 'string', description: 'TOTP secret (base32)' },
            qrCode: { type: 'string', description: 'QR code as data URL' },
            manualEntry: { type: 'string', description: 'Manual entry key' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'MFA is already enabled' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async setupMfa(@CurrentUser() user: any) {
    const result = await this.mfaService.setupMfa(user.id);
    return {
      message: 'MFA setup initiated. Please verify with authenticator app.',
      data: result,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify and enable MFA',
    description:
      'Verifies the TOTP code from your authenticator app and enables MFA. Must be called after /mfa/setup. Also generates backup codes.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA enabled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          description: 'One-time backup codes - store securely!',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async verifyMfa(@CurrentUser() user: any, @Body() dto: VerifyMfaDto) {
    await this.mfaService.verifyAndEnableMfa(user.id, dto.code);
    return {
      success: true,
      message: 'MFA has been enabled successfully',
    };
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Disable MFA',
    description:
      'Disables MFA for your account. Requires both your password and a current TOTP code or backup code for security.',
  })
  @ApiResponse({
    status: 200,
    description: 'MFA disabled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid password or MFA code' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async disableMfa(@CurrentUser() user: any, @Body() dto: DisableMfaDto) {
    await this.mfaService.disableMfa(user.id, dto.password, dto.code);
    return {
      success: true,
      message: 'MFA has been disabled',
    };
  }

  @Post('backup-codes/regenerate')
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description:
      'Generates new backup codes, invalidating all previous codes. Requires a valid TOTP code for verification. Store the new codes securely.',
  })
  @ApiResponse({
    status: 201,
    description: 'New backup codes generated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        backupCodes: {
          type: 'array',
          items: { type: 'string' },
          example: ['ABC12345', 'DEF67890', 'GHI11223'],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async regenerateBackupCodes(
    @CurrentUser() user: any,
    @Body() dto: VerifyMfaDto,
  ) {
    const codes = await this.mfaService.regenerateBackupCodes(
      user.id,
      dto.code,
    );
    return {
      message: 'New backup codes generated. Store them securely.',
      backupCodes: codes,
    };
  }
}
