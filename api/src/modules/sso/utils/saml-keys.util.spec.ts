// Nebula DNS - SAML Signing Utilities Tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  generateSigningKeyPair,
  signXML,
  signXMLWithCertificate,
  verifyXMLSignature,
  extractCertificateBase64,
  buildAuthnRequest,
  buildLogoutRequest,
  generateSamlId,
  getSamlTimestamp,
  SamlKeyPair,
} from './saml-keys.util';

describe('SAML Signing Utilities', () => {
  let keyPair: SamlKeyPair;

  beforeAll(() => {
    // Generate a key pair for testing - this takes a few seconds
    keyPair = generateSigningKeyPair({
      commonName: 'Test SP',
      organization: 'Test Org',
      country: 'US',
      validityDays: 365,
    });
  });

  describe('generateSigningKeyPair', () => {
    it('should generate a valid RSA key pair', () => {
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.certificate).toBeDefined();
    });

    it('should generate a 4096-bit RSA private key in PEM format', () => {
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(keyPair.privateKey).toContain('-----END PRIVATE KEY-----');
    });

    it('should generate a public key in PEM format', () => {
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.publicKey).toContain('-----END PUBLIC KEY-----');
    });

    it('should generate a valid X.509 certificate in PEM format', () => {
      expect(keyPair.certificate).toContain('-----BEGIN CERTIFICATE-----');
      expect(keyPair.certificate).toContain('-----END CERTIFICATE-----');
    });

    it('should use default options when none provided', () => {
      const defaultKeyPair = generateSigningKeyPair();
      expect(defaultKeyPair.certificate).toContain(
        '-----BEGIN CERTIFICATE-----',
      );
    });
  });

  describe('extractCertificateBase64', () => {
    it('should extract base64 content from PEM certificate', () => {
      const base64 = extractCertificateBase64(keyPair.certificate);
      expect(base64).not.toContain('-----BEGIN CERTIFICATE-----');
      expect(base64).not.toContain('-----END CERTIFICATE-----');
      expect(base64).not.toContain('\n');
      expect(base64.length).toBeGreaterThan(0);
    });
  });

  describe('signXML', () => {
    it('should sign an XML document with enveloped signature', () => {
      const xml = `<?xml version="1.0"?><Root><Child>Content</Child></Root>`;
      const signedXml = signXML(xml, keyPair.privateKey);

      expect(signedXml).toContain('<ds:Signature');
      expect(signedXml).toContain('<ds:SignedInfo');
      expect(signedXml).toContain('<ds:SignatureValue');
      expect(signedXml).toContain('<ds:DigestValue');
    });

    it('should produce valid RSA-SHA256 signature', () => {
      const xml = `<?xml version="1.0"?><Test>Data</Test>`;
      const signedXml = signXML(xml, keyPair.privateKey);

      expect(signedXml).toContain('rsa-sha256');
    });
  });

  describe('signXMLWithCertificate', () => {
    it('should sign XML and include X509 certificate in KeyInfo', () => {
      const xml = `<?xml version="1.0"?><Root><Element>Value</Element></Root>`;
      const signedXml = signXMLWithCertificate(
        xml,
        keyPair.privateKey,
        keyPair.certificate,
      );

      expect(signedXml).toContain('<ds:Signature');
      expect(signedXml).toContain('<ds:X509Certificate');
      expect(signedXml).toContain('<ds:X509Data');
    });
  });

  describe('verifyXMLSignature', () => {
    it('should verify a valid XML signature using public key', () => {
      const xml = `<?xml version="1.0"?><Document><Data>Test</Data></Document>`;
      const signedXml = signXML(xml, keyPair.privateKey);

      // Use public key for verification
      const isValid = verifyXMLSignature(signedXml, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject tampered XML', () => {
      const xml = `<?xml version="1.0"?><Document><Data>Original</Data></Document>`;
      const signedXml = signXML(xml, keyPair.privateKey);

      // Tamper with the signed content (not inside signature block)
      // Replace after the signature has been computed
      const tamperedXml = signedXml.replace('>Original<', '>Modified<');

      const isValid = verifyXMLSignature(tamperedXml, keyPair.publicKey);
      expect(isValid).toBe(false);
    });

    it('should return false for XML without signature', () => {
      const xml = `<?xml version="1.0"?><Document><Data>Test</Data></Document>`;
      const isValid = verifyXMLSignature(xml, keyPair.publicKey);
      expect(isValid).toBe(false);
    });
  });

  describe('buildAuthnRequest', () => {
    it('should build a valid SAML AuthnRequest XML', () => {
      const authnRequest = buildAuthnRequest({
        id: '_test-id-123',
        issueInstant: '2026-01-16T00:00:00Z',
        destination: 'https://idp.example.com/sso',
        issuer: 'https://sp.example.com',
        assertionConsumerServiceUrl: 'https://sp.example.com/acs',
      });

      expect(authnRequest).toContain('samlp:AuthnRequest');
      expect(authnRequest).toContain('ID="_test-id-123"');
      expect(authnRequest).toContain(
        'Destination="https://idp.example.com/sso"',
      );
      expect(authnRequest).toContain('saml:Issuer');
      expect(authnRequest).toContain('https://sp.example.com');
      expect(authnRequest).toContain(
        'AssertionConsumerServiceURL="https://sp.example.com/acs"',
      );
    });

    it('should include NameIDPolicy', () => {
      const authnRequest = buildAuthnRequest({
        id: '_test-id',
        issueInstant: '2026-01-16T00:00:00Z',
        destination: 'https://idp.example.com/sso',
        issuer: 'https://sp.example.com',
        assertionConsumerServiceUrl: 'https://sp.example.com/acs',
      });

      expect(authnRequest).toContain('samlp:NameIDPolicy');
      expect(authnRequest).toContain(
        'Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"',
      );
    });

    it('should use custom protocol binding when provided', () => {
      const authnRequest = buildAuthnRequest({
        id: '_test-id',
        issueInstant: '2026-01-16T00:00:00Z',
        destination: 'https://idp.example.com/sso',
        issuer: 'https://sp.example.com',
        assertionConsumerServiceUrl: 'https://sp.example.com/acs',
        protocolBinding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
      });

      expect(authnRequest).toContain(
        'ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"',
      );
    });
  });

  describe('buildLogoutRequest', () => {
    it('should build a valid SAML LogoutRequest XML', () => {
      const logoutRequest = buildLogoutRequest({
        id: '_logout-id-456',
        issueInstant: '2026-01-16T00:00:00Z',
        destination: 'https://idp.example.com/slo',
        issuer: 'https://sp.example.com',
        nameId: 'user@example.com',
      });

      expect(logoutRequest).toContain('samlp:LogoutRequest');
      expect(logoutRequest).toContain('ID="_logout-id-456"');
      expect(logoutRequest).toContain(
        'Destination="https://idp.example.com/slo"',
      );
      expect(logoutRequest).toContain('saml:NameID');
      expect(logoutRequest).toContain('user@example.com');
    });

    it('should include SessionIndex when provided', () => {
      const logoutRequest = buildLogoutRequest({
        id: '_logout-id',
        issueInstant: '2026-01-16T00:00:00Z',
        destination: 'https://idp.example.com/slo',
        issuer: 'https://sp.example.com',
        nameId: 'user@example.com',
        sessionIndex: '_session-index-789',
      });

      expect(logoutRequest).toContain('samlp:SessionIndex');
      expect(logoutRequest).toContain('_session-index-789');
    });

    it('should not include SessionIndex when not provided', () => {
      const logoutRequest = buildLogoutRequest({
        id: '_logout-id',
        issueInstant: '2026-01-16T00:00:00Z',
        destination: 'https://idp.example.com/slo',
        issuer: 'https://sp.example.com',
        nameId: 'user@example.com',
      });

      expect(logoutRequest).not.toContain('SessionIndex');
    });
  });

  describe('generateSamlId', () => {
    it('should generate a unique ID starting with underscore', () => {
      const id = generateSamlId();
      expect(id).toMatch(/^_[a-f0-9]{32}$/);
    });

    it('should generate unique IDs each time', () => {
      const id1 = generateSamlId();
      const id2 = generateSamlId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('getSamlTimestamp', () => {
    it('should return an ISO 8601 timestamp', () => {
      const timestamp = getSamlTimestamp();
      expect(timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('SAML Request Signing Integration', () => {
    it('should sign an AuthnRequest and include signature block', () => {
      const authnRequest = buildAuthnRequest({
        id: generateSamlId(),
        issueInstant: getSamlTimestamp(),
        destination: 'https://idp.example.com/sso',
        issuer: 'https://sp.example.com',
        assertionConsumerServiceUrl: 'https://sp.example.com/acs',
      });

      const signedRequest = signXMLWithCertificate(
        authnRequest,
        keyPair.privateKey,
        keyPair.certificate,
      );

      // Verify the signature block is present with expected elements
      expect(signedRequest).toContain('<ds:Signature');
      expect(signedRequest).toContain('<ds:SignedInfo');
      expect(signedRequest).toContain('<ds:SignatureValue');
      expect(signedRequest).toContain('<ds:X509Certificate');
      expect(signedRequest).toContain('<ds:DigestValue');

      // Verify the signature can be verified with the public key
      const isValid = verifyXMLSignature(signedRequest, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should sign a LogoutRequest and include signature block', () => {
      const logoutRequest = buildLogoutRequest({
        id: generateSamlId(),
        issueInstant: getSamlTimestamp(),
        destination: 'https://idp.example.com/slo',
        issuer: 'https://sp.example.com',
        nameId: 'user@example.com',
        sessionIndex: '_session-123',
      });

      const signedRequest = signXMLWithCertificate(
        logoutRequest,
        keyPair.privateKey,
        keyPair.certificate,
      );

      // Verify the signature block is present
      expect(signedRequest).toContain('<ds:Signature');
      expect(signedRequest).toContain('<ds:X509Certificate');

      // Verify the signature can be verified with the public key
      const isValid = verifyXMLSignature(signedRequest, keyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });
});
