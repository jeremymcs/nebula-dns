import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: ExpressRequest, @Body() loginDto: LoginDto) {
    return this.authService.login((req as any).user);
  }

  @Post('logout')
  async logout() {
    // JWT is stateless, so logout is handled client-side
    // In production, consider token blacklisting
    return { message: 'Logged out successfully' };
  }
}
