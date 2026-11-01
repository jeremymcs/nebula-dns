'use client';

import { useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';

export default function ShieldCertificatePage() {
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getShieldCaMetadata()
      .then((res) => setMeta(res.data))
      .catch(() => setMeta(null))
      .finally(() => setLoading(false));
  }, []);

  const download = (path: string) => {
    window.open(api.shieldCaDownloadUrl(path), '_blank');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-[#1E3B78]">Shield Certificate</h1>
      <p className="text-sm text-space-500 dark:text-space-400">
        Install the Flux Shield CA on endpoints so HTTPS block pages use dynamically minted
        leaf certificates signed by your organization&apos;s Shield intermediate.
      </p>

      {loading ? (
        <p>Loading…</p>
      ) : meta ? (
        <Card className="space-y-3 p-6">
          <p>
            <strong>Expires:</strong>{' '}
            {new Date(meta.notAfter).toLocaleDateString()} ({meta.daysUntilExpiry} days)
          </p>
          {meta.rotationRecommended && (
            <p className="text-amber-600 text-sm">
              Rotation recommended within 30 days — redeploy via MDM/RMM and renew the
              intermediate.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-6 text-sm text-space-500">
          Shield CA is not provisioned yet. Configure platform root signing material and enable
          block pages for this tenant.
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => download('/shield-ca/certificate.cer')}>
          Download .cer
        </Button>
        <Button variant="secondary" onClick={() => download('/shield-ca/certificate.pem')}>
          Download .pem
        </Button>
        <Button
          variant="secondary"
          onClick={() => download('/shield-ca/flux-shield.mobileconfig')}
        >
          iOS / macOS profile
        </Button>
      </div>

      <Card className="prose prose-sm dark:prose-invert max-w-none p-6">
        <h2>Install guidance</h2>
        <ul>
          <li>
            <strong>Windows:</strong> Intune trusted root, GPO, RMM, or Flux agent with{' '}
            <code>install_shield_ca</code>.
          </li>
          <li>
            <strong>macOS / iOS:</strong> MDM mobileconfig or manual keychain trust.
          </li>
          <li>
            <strong>Android / ChromeOS:</strong> Device admin CA install.
          </li>
          <li>
            <strong>Firefox:</strong> Enterprise roots on Windows; policies on ESR.
          </li>
        </ul>
        <h3>What still breaks</h3>
        <p>
          Certificate-pinned applications, Firefox without enterprise root trust, and any device
          without the CA installed. HSTS and HSTS-preloaded sites work once the Shield CA is
          trusted (browsers accept locally installed roots for HSTS).
        </p>
      </Card>
    </div>
  );
}
