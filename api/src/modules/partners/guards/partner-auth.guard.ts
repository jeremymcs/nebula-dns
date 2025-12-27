import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PartnersService } from '../partners.service';

@Injectable()
export class PartnerAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private partnersService: PartnersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Check if this is a partner user token
      if (payload.type !== 'partner') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Fetch the partner user
      const partnerUser = await this.partnersService.findUserById(payload.partnerId, payload.sub);
      
      if (!partnerUser || partnerUser.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Attach to request
      request.partnerId = payload.partnerId;
      request.partnerUser = partnerUser;
      request.partnerUserRole = partnerUser.role;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

