import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto, MfaVerifyLoginDto, MfaRequiredResponseDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, CurrentTenant } from '@/common/decorators/tenant.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and get tokens' })
  @ApiResponse({ status: 200, description: 'Login successful or MFA required', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto | MfaRequiredResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code and complete login' })
  @ApiResponse({ status: 200, description: 'MFA verified, login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid MFA code or token' })
  async verifyMfa(@Body() dto: MfaVerifyLoginDto): Promise<LoginResponseDto> {
    return this.authService.verifyMfaLogin(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshDto: RefreshTokenDto): Promise<LoginResponseDto> {
    return this.authService.refreshToken(refreshDto.refreshToken);
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
  async logout(@CurrentUser() user: any): Promise<void> {
    await this.authService.logout(user.id);
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
  @ApiOperation({ summary: 'Switch to a different organization (MSP users only)' })
  @ApiResponse({ status: 200, description: 'Switched successfully, new tokens returned', type: LoginResponseDto })
  @ApiResponse({ status: 403, description: 'Not authorized to switch to this organization' })
  async switchTenant(
    @CurrentUser() user: any,
    @CurrentTenant() currentTenantId: string,
    @Body() dto: SwitchTenantDto,
  ): Promise<LoginResponseDto> {
    return this.authService.switchTenant(user.id, currentTenantId, dto.tenantId);
  }
}
