// Native (iOS/Android): Face ID / Touch ID / fingerprint via the OS.
import * as LocalAuthentication from 'expo-local-authentication';

export async function biometricAvailable() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

/** Native needs no enrollment beyond the OS; just confirm the user can pass Face ID. */
export async function enrollBiometric(_userId: string, _name: string) {
  return verifyBiometric(_userId);
}

export async function verifyBiometric(_userId: string) {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock your balances',
    fallbackLabel: 'Use passcode',
  });
  return result.success;
}

export async function forgetBiometric(_userId: string) {}
