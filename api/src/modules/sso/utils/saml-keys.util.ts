// Nebula DNS - SAML Signing Utilities
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import * as crypto from 'crypto';
import { SignedXml } from 'xml-crypto';

/**
 * Key pair interface for SAML signing
 */
export interface SamlKeyPair {
  publicKey: string;
  privateKey: string;
  certificate: string;
}

/**
 * Options for certificate generation
 */
export interface CertificateOptions {
  commonName?: string;
  organization?: string;
  country?: string;
  validityDays?: number;
}

/**
 * Default certificate options
 */
const DEFAULT_CERT_OPTIONS: Required<CertificateOptions> = {
  commonName: 'Flux Shield SAML Service Provider',
  organization: 'Flux Labs',
  country: 'US',
  validityDays: 365 * 3, // 3 years
};

/**
 * Generate an RSA 4096-bit key pair for SAML signing
 * Returns PEM-encoded public key, private key, and self-signed X.509 certificate
 */
export function generateSigningKeyPair(
  options: CertificateOptions = {},
): SamlKeyPair {
  const opts = { ...DEFAULT_CERT_OPTIONS, ...options };

  // Generate RSA 4096-bit key pair
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Generate self-signed X.509 certificate
  const certificate = generateSelfSignedCertificate(
    privateKey,
    publicKey,
    opts,
  );

  return {
    publicKey,
    privateKey,
    certificate,
  };
}

/**
 * Generate a self-signed X.509 certificate
 * This creates a basic certificate suitable for SAML signing
 */
function generateSelfSignedCertificate(
  privateKey: string,
  publicKey: string,
  options: Required<CertificateOptions>,
): string {
  // Serial number - random 16-byte integer
  const serialNumber = crypto.randomBytes(16).toString('hex');

  // Calculate validity period
  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setDate(notAfter.getDate() + options.validityDays);

  // Build the subject/issuer distinguished name
  const dn = buildDistinguishedName(options);

  // Extract public key info for embedding in certificate
  const publicKeyDer = crypto
    .createPublicKey(publicKey)
    .export({ type: 'spki', format: 'der' });

  // Build the TBS (To-Be-Signed) Certificate
  const tbsCertificate = buildTbsCertificate(
    serialNumber,
    dn,
    notBefore,
    notAfter,
    publicKeyDer,
  );

  // Sign the TBS certificate with RSA-SHA256
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(tbsCertificate);
  const signature = sign.sign(privateKey);

  // Build final certificate (TBS + signature algorithm + signature)
  const certificate = buildCertificate(tbsCertificate, signature);

  // Convert to PEM format
  const certBase64 = certificate.toString('base64');
  const certPem = formatPem(certBase64, 'CERTIFICATE');

  return certPem;
}

/**
 * Build distinguished name for certificate subject/issuer
 */
function buildDistinguishedName(options: Required<CertificateOptions>): Buffer {
  const components: Buffer[] = [];

  // Country (C)
  if (options.country) {
    components.push(
      buildRdnSequenceComponent(
        Buffer.from([0x55, 0x04, 0x06]), // 2.5.4.6 - Country
        options.country,
        0x13, // PrintableString
      ),
    );
  }

  // Organization (O)
  if (options.organization) {
    components.push(
      buildRdnSequenceComponent(
        Buffer.from([0x55, 0x04, 0x0a]), // 2.5.4.10 - Organization
        options.organization,
        0x0c, // UTF8String
      ),
    );
  }

  // Common Name (CN)
  if (options.commonName) {
    components.push(
      buildRdnSequenceComponent(
        Buffer.from([0x55, 0x04, 0x03]), // 2.5.4.3 - Common Name
        options.commonName,
        0x0c, // UTF8String
      ),
    );
  }

  // Wrap in SEQUENCE
  return wrapSequence(Buffer.concat(components));
}

/**
 * Build a single RDN (Relative Distinguished Name) component
 */
function buildRdnSequenceComponent(
  oid: Buffer,
  value: string,
  stringType: number,
): Buffer {
  // AttributeTypeAndValue ::= SEQUENCE { type OID, value ANY }
  const oidEncoded = wrapTag(0x06, oid); // OID tag
  const valueEncoded = wrapTag(stringType, Buffer.from(value, 'utf8'));
  const atv = wrapSequence(Buffer.concat([oidEncoded, valueEncoded]));

  // RelativeDistinguishedName ::= SET OF AttributeTypeAndValue
  return wrapTag(0x31, atv); // SET tag
}

/**
 * Build the TBS (To-Be-Signed) Certificate structure
 */
function buildTbsCertificate(
  serialNumber: string,
  dn: Buffer,
  notBefore: Date,
  notAfter: Date,
  publicKeyDer: Buffer,
): Buffer {
  const components: Buffer[] = [];

  // Version (v3 = 2, explicit tag [0])
  const version = wrapTag(0xa0, wrapTag(0x02, Buffer.from([0x02])));
  components.push(version);

  // Serial number
  const serial = wrapTag(0x02, Buffer.from(serialNumber.slice(0, 32), 'hex'));
  components.push(serial);

  // Signature algorithm (sha256WithRSAEncryption)
  const sigAlgo = buildSignatureAlgorithm();
  components.push(sigAlgo);

  // Issuer (same as subject for self-signed)
  components.push(dn);

  // Validity
  const validity = buildValidity(notBefore, notAfter);
  components.push(validity);

  // Subject
  components.push(dn);

  // Subject Public Key Info (already DER encoded)
  components.push(publicKeyDer);

  // Extensions (v3)
  const extensions = buildExtensions();
  components.push(wrapTag(0xa3, extensions)); // explicit tag [3]

  return wrapSequence(Buffer.concat(components));
}

/**
 * Build signature algorithm identifier for SHA256 with RSA
 */
function buildSignatureAlgorithm(): Buffer {
  // OID: 1.2.840.113549.1.1.11 (sha256WithRSAEncryption)
  const oid = Buffer.from([
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b,
  ]);
  const oidEncoded = wrapTag(0x06, oid);
  const nullParam = Buffer.from([0x05, 0x00]); // NULL

  return wrapSequence(Buffer.concat([oidEncoded, nullParam]));
}

/**
 * Build validity period
 */
function buildValidity(notBefore: Date, notAfter: Date): Buffer {
  const notBeforeEncoded = wrapTag(0x17, encodeUtcTime(notBefore)); // UTCTime
  const notAfterEncoded = wrapTag(0x17, encodeUtcTime(notAfter)); // UTCTime

  return wrapSequence(Buffer.concat([notBeforeEncoded, notAfterEncoded]));
}

/**
 * Encode date as UTCTime
 */
function encodeUtcTime(date: Date): Buffer {
  const year = (date.getUTCFullYear() % 100).toString().padStart(2, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');

  return Buffer.from(`${year}${month}${day}${hours}${minutes}${seconds}Z`);
}

/**
 * Build basic X.509 v3 extensions
 */
function buildExtensions(): Buffer {
  const extensions: Buffer[] = [];

  // Basic Constraints (CA: FALSE)
  const basicConstraintsOid = Buffer.from([0x55, 0x1d, 0x13]); // 2.5.29.19
  const basicConstraintsValue = wrapSequence(Buffer.from([])); // CA: FALSE (empty sequence)
  extensions.push(
    buildExtension(basicConstraintsOid, basicConstraintsValue, true),
  );

  // Key Usage (digitalSignature, nonRepudiation)
  const keyUsageOid = Buffer.from([0x55, 0x1d, 0x0f]); // 2.5.29.15
  // Bit string: digitalSignature (0) + nonRepudiation (1) = 0xC0
  const keyUsageValue = wrapTag(0x03, Buffer.from([0x02, 0x01, 0xc0]));
  extensions.push(buildExtension(keyUsageOid, keyUsageValue, true));

  return wrapSequence(Buffer.concat(extensions));
}

/**
 * Build a single X.509 extension
 */
function buildExtension(oid: Buffer, value: Buffer, critical: boolean): Buffer {
  const components: Buffer[] = [];
  components.push(wrapTag(0x06, oid)); // OID

  if (critical) {
    components.push(wrapTag(0x01, Buffer.from([0xff]))); // BOOLEAN TRUE
  }

  // Wrap value in OCTET STRING
  components.push(wrapTag(0x04, value));

  return wrapSequence(Buffer.concat(components));
}

/**
 * Build final certificate structure
 */
function buildCertificate(tbsCertificate: Buffer, signature: Buffer): Buffer {
  const sigAlgo = buildSignatureAlgorithm();
  // Signature is a BIT STRING with 0 unused bits
  const sigBitString = wrapTag(
    0x03,
    Buffer.concat([Buffer.from([0x00]), signature]),
  );

  return wrapSequence(Buffer.concat([tbsCertificate, sigAlgo, sigBitString]));
}

/**
 * Wrap data in ASN.1 SEQUENCE
 */
function wrapSequence(data: Buffer): Buffer {
  return wrapTag(0x30, data);
}

/**
 * Wrap data with ASN.1 tag and length
 */
function wrapTag(tag: number, data: Buffer): Buffer {
  const length = encodeLength(data.length);
  return Buffer.concat([Buffer.from([tag]), length, data]);
}

/**
 * Encode ASN.1 length
 */
function encodeLength(length: number): Buffer {
  if (length < 128) {
    return Buffer.from([length]);
  } else if (length < 256) {
    return Buffer.from([0x81, length]);
  } else if (length < 65536) {
    return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
  } else {
    return Buffer.from([
      0x83,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    ]);
  }
}

/**
 * Format base64 data as PEM
 */
function formatPem(base64Data: string, type: string): string {
  const lines: string[] = [];
  lines.push(`-----BEGIN ${type}-----`);

  // Split into 64-character lines
  for (let i = 0; i < base64Data.length; i += 64) {
    lines.push(base64Data.slice(i, i + 64));
  }

  lines.push(`-----END ${type}-----`);
  return lines.join('\n');
}

/**
 * Extract the base64 certificate data from PEM format
 */
export function extractCertificateBase64(pemCertificate: string): string {
  return pemCertificate
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');
}

/**
 * Sign an XML document using RSA-SHA256 with enveloped signature
 * The signature is inserted as the first child of the root element
 */
export function signXML(xml: string, privateKey: string): string {
  const sig = new SignedXml({
    privateKey,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  });

  // Add reference with transforms for enveloped signature
  sig.addReference({
    xpath: '/*',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });

  sig.computeSignature(xml, {
    prefix: 'ds',
    location: {
      reference: '/*',
      action: 'prepend',
    },
  });

  return sig.getSignedXml();
}

/**
 * Sign an XML document and include the X.509 certificate in KeyInfo
 */
export function signXMLWithCertificate(
  xml: string,
  privateKey: string,
  certificate: string,
): string {
  const certBase64 = extractCertificateBase64(certificate);

  const sig = new SignedXml({
    privateKey,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    publicCert: certificate,
  });

  // Add reference with transforms for enveloped signature
  sig.addReference({
    xpath: '/*',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });

  // Set custom getKeyInfoContent to include X509 certificate
  (sig as any).getKeyInfoContent = () => {
    return `<ds:X509Data><ds:X509Certificate>${certBase64}</ds:X509Certificate></ds:X509Data>`;
  };

  sig.computeSignature(xml, {
    prefix: 'ds',
    location: {
      reference: '/*',
      action: 'prepend',
    },
  });

  return sig.getSignedXml();
}

/**
 * Verify an XML signature against a public key or certificate
 */
export function verifyXMLSignature(
  signedXml: string,
  publicKeyOrCert: string,
): boolean {
  try {
    const sig = new SignedXml({
      publicCert: publicKeyOrCert,
    });

    // Find signature element
    const signatureMatch = signedXml.match(
      /<(?:ds:)?Signature[^>]*>[\s\S]*?<\/(?:ds:)?Signature>/,
    );
    if (!signatureMatch) {
      return false;
    }

    sig.loadSignature(signatureMatch[0]);
    return sig.checkSignature(signedXml);
  } catch {
    return false;
  }
}

/**
 * Build a SAML AuthnRequest XML document
 */
export function buildAuthnRequest(options: {
  id: string;
  issueInstant: string;
  destination: string;
  issuer: string;
  assertionConsumerServiceUrl: string;
  protocolBinding?: string;
  nameIdFormat?: string;
}): string {
  const protocolBinding =
    options.protocolBinding || 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST';
  const nameIdFormat =
    options.nameIdFormat ||
    'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';

  return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${options.id}"
    Version="2.0"
    IssueInstant="${options.issueInstant}"
    Destination="${options.destination}"
    ProtocolBinding="${protocolBinding}"
    AssertionConsumerServiceURL="${options.assertionConsumerServiceUrl}">
  <saml:Issuer>${options.issuer}</saml:Issuer>
  <samlp:NameIDPolicy Format="${nameIdFormat}" AllowCreate="true"/>
</samlp:AuthnRequest>`;
}

/**
 * Build a SAML LogoutRequest XML document
 */
export function buildLogoutRequest(options: {
  id: string;
  issueInstant: string;
  destination: string;
  issuer: string;
  nameId: string;
  sessionIndex?: string;
}): string {
  let sessionIndexElement = '';
  if (options.sessionIndex) {
    sessionIndexElement = `\n  <samlp:SessionIndex>${options.sessionIndex}</samlp:SessionIndex>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${options.id}"
    Version="2.0"
    IssueInstant="${options.issueInstant}"
    Destination="${options.destination}">
  <saml:Issuer>${options.issuer}</saml:Issuer>
  <saml:NameID>${options.nameId}</saml:NameID>${sessionIndexElement}
</samlp:LogoutRequest>`;
}

/**
 * Generate a unique ID for SAML requests
 */
export function generateSamlId(): string {
  // SAML IDs must start with a letter or underscore
  return '_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Get current ISO timestamp for SAML
 */
export function getSamlTimestamp(): string {
  return new Date().toISOString();
}
