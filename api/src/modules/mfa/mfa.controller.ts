import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { VerifyMfaDto, DisableMfaDto } from './dto/mfa.dto';

@Controller('mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('status')
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
  async setupMfa(@CurrentUser() user: any) {
    const result = await this.mfaService.setupMfa(user.id);
    return {
      message: 'MFA setup initiated. Please verify with authenticator app.',
      data: result,
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@CurrentUser() user: any, @Body() dto: VerifyMfaDto) {
    await this.mfaService.verifyAndEnableMfa(user.id, dto.code);
    return {
      success: true,
      message: 'MFA has been enabled successfully',
    };
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disableMfa(@CurrentUser() user: any, @Body() dto: DisableMfaDto) {
    await this.mfaService.disableMfa(user.id, dto.password, dto.code);
    return {
      success: true,
      message: 'MFA has been disabled',
    };
  }

  @Post('backup-codes/regenerate')
  async regenerateBackupCodes(@CurrentUser() user: any, @Body() dto: VerifyMfaDto) {
    const codes = await this.mfaService.regenerateBackupCodes(user.id, dto.code);
    return {
      message: 'New backup codes generated. Store them securely.',
      backupCodes: codes,
    };
  }
}
