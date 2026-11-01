// Nebula DNS - SSO configuration entity subscriber
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { SsoConfiguration } from '../entities/sso-configuration.entity';

@EventSubscriber()
export class SsoConfigurationSubscriber
  implements EntitySubscriberInterface<SsoConfiguration>
{
  listenTo() {
    return SsoConfiguration;
  }

  private syncLegacyType(entity: SsoConfiguration): void {
    if (entity.providerType && !entity.legacyType) {
      entity.legacyType = entity.providerType;
    }
  }

  beforeInsert(event: InsertEvent<SsoConfiguration>): void {
    if (event.entity) {
      this.syncLegacyType(event.entity);
    }
  }

  beforeUpdate(event: UpdateEvent<SsoConfiguration>): void {
    if (event.entity) {
      this.syncLegacyType(event.entity as SsoConfiguration);
    }
  }
}
