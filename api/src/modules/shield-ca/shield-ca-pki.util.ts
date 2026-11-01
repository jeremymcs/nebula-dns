import * as forge from 'node-forge';
import * as crypto from 'crypto';

export interface GeneratedCa {
  certificatePem: string;
  privateKeyPem: string;
  serialNumber: string;
  notBefore: Date;
  notAfter: Date;
  subjectCn: string;
}

export interface GeneratedLeaf {
  certificatePem: string;
  privateKeyPem: string;
  notBefore: Date;
  notAfter: Date;
}

function randomSerial(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function parsePemCertificate(pem: string): forge.pki.Certificate {
  return forge.pki.certificateFromPem(pem);
}

export function parsePemPrivateKey(pem: string): forge.pki.PrivateKey {
  return forge.pki.privateKeyFromPem(pem);
}

export function generateIntermediateCa(options: {
  rootCertPem: string;
  rootKeyPem: string;
  subjectCn: string;
  validityDays: number;
}): GeneratedCa {
  const rootCert = parsePemCertificate(options.rootCertPem);
  const rootKey = parsePemPrivateKey(options.rootKeyPem);
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerial();
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(
    now.getTime() + options.validityDays * 86400000,
  );

  const attrs = [
    { name: 'commonName', value: options.subjectCn },
    { name: 'organizationName', value: 'Flux Shield' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(rootCert.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, pathLenConstraint: 0 },
    {
      name: 'keyUsage',
      keyCertSign: true,
      cRLSign: true,
      digitalSignature: true,
    },
  ]);
  cert.sign(rootKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create());

  return {
    certificatePem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    serialNumber: cert.serialNumber,
    notBefore: cert.validity.notBefore,
    notAfter: cert.validity.notAfter,
    subjectCn: options.subjectCn,
  };
}

export function issueLeafCertificate(options: {
  intermediateCertPem: string;
  intermediateKeyPem: string;
  domain: string;
  validityHours: number;
}): GeneratedLeaf {
  const domain = options.domain.toLowerCase().replace(/\.$/, '');
  if (
    !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
      domain,
    )
  ) {
    throw new Error('Invalid domain for leaf issuance');
  }

  const caCert = parsePemCertificate(options.intermediateCertPem);
  const caKey = parsePemPrivateKey(options.intermediateKeyPem);
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerial();
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(
    now.getTime() + options.validityHours * 3600000,
  );

  cert.setSubject([{ name: 'commonName', value: domain }]);
  cert.setIssuer(caCert.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [{ type: 2, value: domain }],
    },
  ]);
  cert.sign(caKey as forge.pki.rsa.PrivateKey, forge.md.sha256.create());

  return {
    certificatePem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
    notBefore: cert.validity.notBefore,
    notAfter: cert.validity.notAfter,
  };
}

export function buildAppleMobileconfig(options: {
  organizationName: string;
  profileDisplayName: string;
  certificatePem: string;
  profileUuid: string;
}): string {
  const certDer = forge.util.encode64(
    forge.asn1
      .toDer(
        forge.pki.certificateToAsn1(
          parsePemCertificate(options.certificatePem),
        ),
      )
      .getBytes(),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>PayloadContent</key><array><dict>
    <key>PayloadCertificateFileName</key><string>FluxShieldCA.cer</string>
    <key>PayloadContent</key><data>${certDer}</data>
    <key>PayloadDescription</key><string>Flux Shield block page CA</string>
    <key>PayloadDisplayName</key><string>${options.profileDisplayName}</string>
    <key>PayloadIdentifier</key><string>net.fluxlabs.shield.ca</string>
    <key>PayloadType</key><string>com.apple.security.root</string>
    <key>PayloadUUID</key><string>${options.profileUuid}</string>
    <key>PayloadVersion</key><integer>1</integer>
  </dict></array>
  <key>PayloadDisplayName</key><string>${options.profileDisplayName}</string>
  <key>PayloadIdentifier</key><string>net.fluxlabs.shield.profile</string>
  <key>PayloadOrganization</key><string>${options.organizationName}</string>
  <key>PayloadRemovalDisallowed</key><false/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${options.profileUuid}</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict></plist>`;
}
