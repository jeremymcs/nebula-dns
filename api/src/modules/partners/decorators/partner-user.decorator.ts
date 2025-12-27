import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PartnerUser } from '../entities/partner-user.entity';

export const CurrentPartnerUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PartnerUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.partnerUser;
  },
);

