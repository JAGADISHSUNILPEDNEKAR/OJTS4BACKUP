/**
 * Auth-flow regression tests.
 *
 * Commit bc51199 ("gate mock fallback to network errors") broke demo
 * sign-in / sign-up in static-data mode because the fallback only fired
 * on Chrome's specific TypeError("Failed to fetch") string. On Safari
 * ("Load failed"), Firefox ("NetworkError..."), or any HTTP response
 * (mixed-content block, proxy 502), the mock fallback was skipped and
 * the demo login surfaced an opaque error.
 *
 * These tests lock in the fix: in static-data mode (the demo deployment),
 * login()/register() short-circuit to the mock without going through
 * fetch at all, so the path is bulletproof regardless of browser /
 * hosting / network state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Vitest runs in Node by default. NEXT_PUBLIC_USE_STATIC_DATA is unset,
// which means `USE_STATIC_DATA = process.env.NEXT_PUBLIC_USE_STATIC_DATA !== 'false'`
// evaluates to `true` — i.e. the demo-deployment default.

// Provide a localStorage-like shim for the auth-store, which the api module
// reaches into via setTokens / setUser. The token-store module is browser-
// only, so we mock the persistence surface.
beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    });
    // The api module's token helpers short-circuit to null when
    // `typeof window === 'undefined'`. Stub a minimal window so the
    // browser-only persistence paths are exercised.
    vi.stubGlobal('window', { localStorage: globalThis.localStorage, dispatchEvent: () => true });
    // btoa exists in Node 16+, but stub it defensively so the mock token
    // generator (`'m_dev_token_' + btoa(email)`) works in any env.
    if (typeof globalThis.btoa !== 'function') {
        vi.stubGlobal('btoa', (s: string) => Buffer.from(s, 'utf-8').toString('base64'));
    }
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('login() in static-data mode', () => {
    it('returns a mock session without calling fetch', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const { login } = await import('./api');
        const result = await login('admin@origin.demo', 'demo');

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(result.access_token).toMatch(/^m_dev_token_/);
        expect(result.user.email).toBe('admin@origin.demo');
        expect(result.user.role).toBe('SUPERADMIN');
        expect(result.user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('infers role from email prefix for each demo persona', async () => {
        vi.stubGlobal('fetch', vi.fn());
        const { login } = await import('./api');

        const cases: Array<[string, string]> = [
            ['farmer@origin.demo', 'FARMER'],
            ['logistics@origin.demo', 'LOGISTICS'],
            ['auditor@origin.demo', 'AUDITOR'],
            ['retailer@origin.demo', 'RETAILER'],
            ['government@origin.demo', 'GOVERNMENT'],
            ['consumer@origin.demo', 'CONSUMER'],
            ['company@origin.demo', 'COMPANY'],
            ['admin@origin.demo', 'SUPERADMIN'],
        ];

        for (const [email, expectedRole] of cases) {
            const result = await login(email, 'demo');
            expect(result.user.role, `role for ${email}`).toBe(expectedRole);
        }
    });
});

describe('register() in static-data mode', () => {
    it('returns a mock session without calling fetch', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const { register } = await import('./api');
        const result = await register('newuser@example.com', 'demo', 'FARMER');

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(result.user.email).toBe('newuser@example.com');
        expect(result.user.role).toBe('FARMER');
    });

    it('falls back to email-inferred role when none is supplied', async () => {
        vi.stubGlobal('fetch', vi.fn());
        const { register } = await import('./api');
        const result = await register('logistics-newhire@example.com', 'demo');
        expect(result.user.role).toBe('LOGISTICS');
    });
});

describe('refreshAccessToken() in static-data mode', () => {
    it('returns true without hitting the network when a token is stored', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const { login, refreshAccessToken } = await import('./api');
        await login('admin@origin.demo', 'demo');

        const ok = await refreshAccessToken();
        expect(ok).toBe(true);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('returns false when no refresh token is stored', async () => {
        vi.stubGlobal('fetch', vi.fn());
        const { refreshAccessToken } = await import('./api');
        const ok = await refreshAccessToken();
        expect(ok).toBe(false);
    });
});
