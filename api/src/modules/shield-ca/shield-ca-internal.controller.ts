import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ShieldCaService } from './shield-ca.service';

class IssueLeafDto {
  domain!: string;
}

@ApiTags('shield-ca')
@Controller('shield-ca/internal')
export class ShieldCaInternalController {
  constructor(private readonly shieldCaService: ShieldCaService) {}

  @Get('caddy-ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Caddy on-demand TLS ask endpoint (blocked domains only)',
  })
  async caddyAsk(
    @Query('domain') domain: string,
    @Headers('x-shield-internal-secret') secret: string,
    @Res() res: Response,
  ) {
    this.shieldCaService.assertInternalSecret(secret);
    const allowed = await this.shieldCaService.caddyAskAllowed(domain);
    if (!allowed) {
      return res.status(403).send('denied');
    }
    return res.status(200).send('ok');
  }

  @Post('issue-leaf')
  @ApiOperation({
    summary: 'Mint short-lived leaf certificate for blocked host',
  })
  async issueLeaf(
    @Body() body: IssueLeafDto,
    @Headers('x-shield-internal-secret') secret: string,
  ) {
    this.shieldCaService.assertInternalSecret(secret);
    return {
      data: await this.shieldCaService.issueLeafForDomain(body.domain),
    };
  }
}
