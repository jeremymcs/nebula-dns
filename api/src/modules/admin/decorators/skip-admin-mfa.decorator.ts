// Flux Shield - Skip Admin MFA verification for selected routes
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import { SetMetadata } from '@nestjs/common';

export const SKIP_ADMIN_MFA_KEY = 'skipAdminMfa';

/**
 * Marks an admin route as accessible with a password-only JWT (before MFA verify/enroll).
 */
export const SkipAdminMfa = () => SetMetadata(SKIP_ADMIN_MFA_KEY, true);
