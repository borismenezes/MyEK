import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { createLogger } from '@utils/logger';

const log = createLogger('Auth/Biometric');

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: false });

export type BiometryKind = 'faceId' | 'touchId' | 'fingerprint' | 'unknown' | 'none';

export interface BiometricCapability {
  available: boolean;
  kind: BiometryKind;
}

/**
 * Synchronously-resolved capability check. Returns whether the device can
 * prompt at all and, if so, which biometric the OS will surface.
 *
 *  - `none` → no hardware, no enrolled biometric, or user disabled it
 *  - `faceId` / `touchId` → iOS
 *  - `fingerprint` → Android
 *  - `unknown` → vendor returned an unrecognised type
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    if (!available) return { available: false, kind: 'none' };
    if (biometryType === BiometryTypes.FaceID) return { available: true, kind: 'faceId' };
    if (biometryType === BiometryTypes.TouchID) return { available: true, kind: 'touchId' };
    if (biometryType === BiometryTypes.Biometrics) return { available: true, kind: 'fingerprint' };
    return { available: true, kind: 'unknown' };
  } catch (e) {
    log.warn('Capability probe failed', e);
    return { available: false, kind: 'none' };
  }
}

/**
 * Prompt the user for biometric verification and resolve `true` only on a
 * successful match. `false` is returned for cancellation, lockout, or any
 * other failure path — the caller decides what to do (typically: fall
 * through to interactive sign-in).
 *
 * The OS shows its own confirmation UI; we don't render any chrome here.
 */
export async function promptBiometric(reason: string): Promise<boolean> {
  try {
    const cap = await getBiometricCapability();
    if (!cap.available) {
      log.info('Biometric unavailable — skipping prompt');
      return false;
    }
    const { success, error } = await rnBiometrics.simplePrompt({
      promptMessage: reason,
      cancelButtonText: 'Use password',
    });
    if (!success && error) log.info('Biometric prompt declined / failed', { error });
    return success;
  } catch (e) {
    log.warn('Biometric prompt threw', e);
    return false;
  }
}
