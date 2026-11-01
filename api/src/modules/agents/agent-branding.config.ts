import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AgentBrandingConfig {
  constructor(private readonly configService: ConfigService) {}

  get dnsServerHosts(): [string, string] {
    const primary =
      this.configService.get<string>('FLUX_DNS1_HOST') ||
      'dns1.shield.fluxlabs.net';
    const secondary =
      this.configService.get<string>('FLUX_DNS2_HOST') ||
      'dns2.shield.fluxlabs.net';
    return [primary, secondary];
  }

  get apiEndpoint(): string {
    return (
      this.configService.get<string>('PUBLIC_API_URL') ||
      'https://api.shield.fluxlabs.net'
    );
  }

  get dohEndpoint(): string {
    return (
      this.configService.get<string>('PUBLIC_DOH_URL') ||
      'https://dns.shield.fluxlabs.net/dns-query'
    );
  }
}
