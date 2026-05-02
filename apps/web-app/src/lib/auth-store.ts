"use client";

import { useSyncExternalStore } from 'react';
import type { User } from './api';

const STORAGE_KEY = 'origin_user';
export const AUTH_CHANGE_EVENT = 'origin-auth-change';

// Cache the parsed snapshot keyed by the raw localStorage string so
// useSyncExternalStore sees a stable reference when nothing has changed.
// Returning a new object each call would cause infinite re-renders.
let cachedSnapshot: User | null = null;
let cachedRaw: string | null | undefined = undefined;

function getSnapshot(): User | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    try {
        cachedSnapshot = raw ? (JSON.parse(raw) as User) : null;
    } catch {
        cachedSnapshot = null;
    }
    return cachedSnapshot;
}

function getServerSnapshot(): User | null {
    return null;
}

function subscribe(listener: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', listener);
    window.addEventListener(AUTH_CHANGE_EVENT, listener);
    return () => {
        window.removeEventListener('storage', listener);
        window.removeEventListener(AUTH_CHANGE_EVENT, listener);
    };
}

/**
 * React hook for the current authenticated user.
 *
 * SSR + first client render return null (matches getServerSnapshot) so
 * Next.js doesn't flag a hydration mismatch. After mount, the hook reads
 * localStorage and re-renders subscribers when setUser/clearAuth fire the
 * AUTH_CHANGE_EVENT or another tab mutates storage.
 */
export function useUser(): User | null {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Force-refresh the snapshot cache. Call after a same-tab localStorage
 * mutation that doesn't go through setUser/clearAuth (rare).
 */
export function notifyAuthChange(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
    }
}
