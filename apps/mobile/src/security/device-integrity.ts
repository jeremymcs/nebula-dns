/** MVP: no native jailbreak module in CI; register honest default and gate writes when true. */
export function isDeviceCompromised(): boolean {
  return false;
}

export function isWriteAllowed(compromised = isDeviceCompromised()): boolean {
  return !compromised;
}
