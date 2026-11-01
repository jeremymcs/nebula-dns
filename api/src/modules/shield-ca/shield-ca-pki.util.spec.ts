import {
  generateIntermediateCa,
  issueLeafCertificate,
  buildAppleMobileconfig,
  parsePemCertificate,
} from './shield-ca-pki.util';
import * as forge from 'node-forge';

function generateTestRoot(): { certPem: string; keyPem: string } {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 86400000 * 365);
  cert.setSubject([{ name: 'commonName', value: 'Test Flux Shield Root' }]);
  cert.setIssuer([{ name: 'commonName', value: 'Test Flux Shield Root' }]);
  cert.setExtensions([{ name: 'basicConstraints', cA: true }]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

describe('shield-ca-pki.util', () => {
  const root = generateTestRoot();

  it('generates intermediate signed by root', () => {
    const intermediate = generateIntermediateCa({
      rootCertPem: root.certPem,
      rootKeyPem: root.keyPem,
      subjectCn: 'Flux Shield MSP test-msp',
      validityDays: 400,
    });
    expect(intermediate.certificatePem).toContain('BEGIN CERTIFICATE');
    const parsed = parsePemCertificate(intermediate.certificatePem);
    const bc = parsed.getExtension('basicConstraints') as { cA?: boolean };
    expect(bc?.cA).toBe(true);
  });

  it('issues leaf for blocked hostname with SAN', () => {
    const intermediate = generateIntermediateCa({
      rootCertPem: root.certPem,
      rootKeyPem: root.keyPem,
      subjectCn: 'Flux Shield TENANT test',
      validityDays: 400,
    });
    const leaf = issueLeafCertificate({
      intermediateCertPem: intermediate.certificatePem,
      intermediateKeyPem: intermediate.privateKeyPem,
      domain: 'blocked.example.com',
      validityHours: 12,
    });
    expect(leaf.certificatePem).toContain('BEGIN CERTIFICATE');
    const leafCert = parsePemCertificate(leaf.certificatePem);
    const san = leafCert.getExtension('subjectAltName') as { altNames?: { value: string }[] };
    expect(san?.altNames?.[0]?.value).toBe('blocked.example.com');
  });

  it('builds Apple mobileconfig XML', () => {
    const intermediate = generateIntermediateCa({
      rootCertPem: root.certPem,
      rootKeyPem: root.keyPem,
      subjectCn: 'Flux Shield MSP test',
      validityDays: 400,
    });
    const xml = buildAppleMobileconfig({
      organizationName: 'Acme MSP',
      profileDisplayName: 'Flux Shield Certificate',
      certificatePem: intermediate.certificatePem,
      profileUuid: '11111111-1111-1111-1111-111111111111',
    });
    expect(xml).toContain('com.apple.security.root');
    expect(xml).toContain('Acme MSP');
  });

  it('rejects invalid leaf domain', () => {
    const intermediate = generateIntermediateCa({
      rootCertPem: root.certPem,
      rootKeyPem: root.keyPem,
      subjectCn: 'Flux Shield TENANT test',
      validityDays: 400,
    });
    expect(() =>
      issueLeafCertificate({
        intermediateCertPem: intermediate.certificatePem,
        intermediateKeyPem: intermediate.privateKeyPem,
        domain: 'not a domain',
        validityHours: 1,
      }),
    ).toThrow('Invalid domain');
  });
});
