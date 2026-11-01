import { authenticateWithBiometrics, canUseBiometrics } from '../auth/biometric';

describe('biometric helpers', () => {
  it('detects hardware availability', async () => {
    await expect(canUseBiometrics()).resolves.toBe(true);
  });

  it('authenticates successfully when mocked', async () => {
    await expect(authenticateWithBiometrics()).resolves.toBe(true);
  });
});
