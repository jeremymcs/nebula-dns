/**
 * Nebula DNS - Enterprise DNS Security Platform
 * DoH Controller - RFC 8484 DNS-over-HTTPS endpoint
 */

import {
  Controller,
  Post,
  Get,
  Req,
  Res,
  Headers,
  Query,
  Logger,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiProduces } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DoHService } from './doh.service';
import { DoHAuthGuard } from './doh-auth.guard';

@ApiTags('dns')
@Controller('dns-query')
export class DoHController {
  private readonly logger = new Logger(DoHController.name);

  constructor(private readonly dohService: DoHService) {}

  /**
   * Handle DoH POST requests (RFC 8484)
   * Content-Type: application/dns-message
   */
  @Post()
  @UseGuards(DoHAuthGuard)
  @ApiOperation({ summary: 'DNS-over-HTTPS POST endpoint (RFC 8484)' })
  @ApiHeader({ name: 'Content-Type', description: 'application/dns-message' })
  @ApiProduces('application/dns-message')
  async handlePost(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('authorization') authHeader: string,
    @Headers('x-location-id') locationId: string,
  ) {
    const startTime = Date.now();

    try {
      // Read raw body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const dnsWire = Buffer.concat(chunks);

      if (dnsWire.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).send('Empty DNS message');
      }

      // Extract tenant/location from auth
      const auth = this.dohService.extractAuth(authHeader, locationId);
      if (!auth.tenantId || !auth.locationId) {
        return res.status(HttpStatus.UNAUTHORIZED).send('Invalid authentication');
      }

      // Process DNS query
      const response = await this.dohService.processQuery(dnsWire, auth);

      // Log query time
      const elapsed = Date.now() - startTime;
      this.logger.debug(`DoH query processed in ${elapsed}ms`);

      // Send response
      res.setHeader('Content-Type', 'application/dns-message');
      res.setHeader('Cache-Control', 'max-age=300');
      return res.send(response);
    } catch (error) {
      this.logger.error('DoH POST error', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('DNS resolution failed');
    }
  }

  /**
   * Handle DoH GET requests (RFC 8484)
   * Query parameter: ?dns=<base64url-encoded-dns-message>
   */
  @Get()
  @UseGuards(DoHAuthGuard)
  @ApiOperation({ summary: 'DNS-over-HTTPS GET endpoint (RFC 8484)' })
  @ApiProduces('application/dns-message')
  async handleGet(
    @Res() res: Response,
    @Query('dns') dnsParam: string,
    @Headers('authorization') authHeader: string,
    @Headers('x-location-id') locationId: string,
  ) {
    const startTime = Date.now();

    try {
      if (!dnsParam) {
        return res.status(HttpStatus.BAD_REQUEST).send('Missing dns parameter');
      }

      // Decode base64url DNS message
      const dnsWire = Buffer.from(dnsParam, 'base64url');

      // Extract tenant/location from auth
      const auth = this.dohService.extractAuth(authHeader, locationId);
      if (!auth.tenantId || !auth.locationId) {
        return res.status(HttpStatus.UNAUTHORIZED).send('Invalid authentication');
      }

      // Process DNS query
      const response = await this.dohService.processQuery(dnsWire, auth);

      // Log query time
      const elapsed = Date.now() - startTime;
      this.logger.debug(`DoH query processed in ${elapsed}ms`);

      // Send response
      res.setHeader('Content-Type', 'application/dns-message');
      res.setHeader('Cache-Control', 'max-age=300');
      return res.send(response);
    } catch (error) {
      this.logger.error('DoH GET error', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('DNS resolution failed');
    }
  }
}

