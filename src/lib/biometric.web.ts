// Web: Face ID / Touch ID / Windows Hello through a platform passkey (WebAuthn).
// The passkey only proves "the owner of this device is present"; nothing is sent to a server.

const storageKey = (userId: string) => `jibi.passkey.${userId}`;

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const toBase64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function read(userId: string) {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

export async function biometricAvailable() {
  try {
    return (
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

/** Creates a device-bound passkey for this user; the OS asks for Face ID to create it. */
export async function enrollBiometric(userId: string, name: string) {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: random(32),
        rp: { name: 'jibi' },
        user: { id: new TextEncoder().encode(userId), name: `${name} (jibi)`, displayName: name },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        attestation: 'none',
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return false;
    localStorage.setItem(storageKey(userId), toBase64(credential.rawId));
    return true;
  } catch {
    return false; // cancelled or not allowed
  }
}

/** Asks for Face ID using the passkey created at enrollment. */
export async function verifyBiometric(userId: string) {
  const id = read(userId);
  if (!id) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: 'public-key', id: fromBase64(id), transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export async function forgetBiometric(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // storage unavailable; nothing to forget
  }
}
