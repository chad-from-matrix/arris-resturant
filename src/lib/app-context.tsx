'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseReady, getAuthClient } from './firebase';
import { DEFAULT_SETTINGS } from './format';
import { hasPermission } from './permissions';
import { subscribeSettings } from './db/settings';
import { subscribeBranches } from './db/branches';
import { getStaffProfile } from './db/staff';
import type { AppSettings, Branch, Staff } from './types';
import type { Actor } from './db/audit';

interface AppContextValue {
  firebaseReady: boolean;
  settings: AppSettings;
  branches: Branch[];
  user: User | null;
  staff: Staff | null;
  authLoading: boolean;
  /** Set when a signed-in Auth user has no active staff record. */
  accessError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  can: (permission: string) => boolean;
  actor: Actor;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseReady) {
      setAuthLoading(false);
      return;
    }
    const unsubSettings = subscribeSettings(setSettings, () => undefined);
    const unsubBranches = subscribeBranches(setBranches, () => undefined);
    return () => {
      unsubSettings();
      unsubBranches();
    };
  }, []);

  useEffect(() => {
    if (!firebaseReady) return;
    return onAuthStateChanged(getAuthClient(), async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setStaff(null);
        setAccessError(null);
        setAuthLoading(false);
        return;
      }
      try {
        const profile = await getStaffProfile(nextUser.uid);
        if (!profile) {
          setStaff(null);
          setAccessError(
            'This account has no staff record yet. Ask a super admin to add you under Admin → Staff.',
          );
        } else if (!profile.active) {
          setStaff(null);
          setAccessError('This staff account has been deactivated.');
        } else {
          setStaff(profile);
          setAccessError(null);
        }
      } catch {
        setStaff(null);
        setAccessError('Could not load your staff profile. Check your connection and try again.');
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(getAuthClient(), email.trim(), password);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(getAuthClient());
  }, []);

  const can = useCallback(
    (permission: string) => hasPermission(staff?.role ?? null, permission),
    [staff],
  );

  const actor = useMemo<Actor>(
    () => ({ uid: staff?.uid ?? '', name: staff?.name ?? staff?.email ?? 'Unknown' }),
    [staff],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      firebaseReady,
      settings,
      branches,
      user,
      staff,
      authLoading,
      accessError,
      signIn,
      signOutUser,
      can,
      actor,
    }),
    [settings, branches, user, staff, authLoading, accessError, signIn, signOutUser, can, actor],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Convenience for the many price call sites. */
export function useCurrency() {
  const { settings } = useApp();
  return settings;
}
