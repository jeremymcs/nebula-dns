import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.configService.get<string>('INTERNAL_API_SECRET');
    if (!secret?.trim()) {
      throw new UnauthorizedException('Internal API is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['x-internal-secret'];
    const provided = Array.isArray(header) ? header[0] : header;

    if (!provided || provided !== secret) {
      throw new UnauthorizedException('Invalid internal credentials');
    }

    return true;
  }
}
