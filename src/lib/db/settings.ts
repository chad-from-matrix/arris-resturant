import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb } from '../firebase';
import { DEFAULT_SETTINGS } from '../format';
import type { AppSettings } from '../types';
import { COL, SETTINGS_DOC_ID } from './collections';
import { auditDiff, type Actor } from './audit';

export function subscribeSettings(
  cb: (settings: AppSettings) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    doc(getDb(), COL.settings, SETTINGS_DOC_ID),
    (snap) => {
      cb(
        snap.exists()
          ? ({ ...DEFAULT_SETTINGS, id: snap.id, ...snap.data() } as AppSettings)
          : DEFAULT_SETTINGS,
      );
    },
    onError,
  );
}

export async function saveSettings(
  actor: Actor,
  before: AppSettings,
  patch: Partial<AppSettings>,
): Promise<void> {
  await setDoc(doc(getDb(), COL.settings, SETTINGS_DOC_ID), patch, { merge: true });
  await auditDiff(actor, 'settings', SETTINGS_DOC_ID, before, { ...before, ...patch }, [
    'restaurantName',
    'tagline',
    'currencyCode',
    'currencySymbol',
    'currencyPosition',
    'decimalPlaces',
    'logoUrl',
    'contactPhone',
    'contactEmail',
  ]);
}
