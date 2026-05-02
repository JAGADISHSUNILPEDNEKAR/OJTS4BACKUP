/**
 * API Client for the Origin platform.
 * In mock/local mode, reads from pre-built static JSON in /data/ (served from CDN on Vercel).
 * In production mode with a live backend, hits the API Gateway.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/v1';
const USE_STATIC_DATA = process.env.NEXT_PUBLIC_USE_STATIC_DATA !== 'false'; // Default: true

// ─── Pagination Types ────────────────────────────────────────────
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    totalPages: number;
    pageSize: number;
}

export interface DatasetStats {
    totalShipments: number;
    totalAlerts: number;
    avgRiskScore: number;
    totalEscrowBTC: number;
    totalEscrowUSD: number;
    statusCounts: Record<string, number>;
    fraudCount: number;
    tempViolations: number;
    routeDeviations: number;
    originMismatches: number;
    topCategories: Array<{ name: string; count: number }>;
    regionCounts: Record<string, number>;
    shippingModeCounts: Record<string, number>;
    passedAudits: number;
    failedAudits: number;
    warningAudits: number;
    criticalAlerts: number;
    warningAlerts: number;
}

// ─── Domain Types ────────────────────────────────────────────────
export interface Shipment {
    id: string;
    origin: string;
    destination: string;
    farmer_id: string;
    status: string;
    risk_score?: number;
    created_at?: string;
    product?: string;
    category?: string;
    shipping_mode?: string;
    [key: string]: unknown;
}

export interface Alert {
    id: string;
    shipment_id: string;
    severity: string;
    type: string;
    timestamp: string;
    status: string;
    message?: string;
}

export interface Escrow {
    id: string;
    shipment_id: string;
    amount: string;
    status: string;
    counterparty: string;
    risk: number;
    value: number;
}

export interface Audit {
    id: string;
    shipment_id: string;
    entity: string;
    type: string;
    auditor: string;
    status: string;
    findings: number;
    timestamp: string;
}

// ─── Auth Helpers ────────────────────────────────────────────────
export type UserRoleString =
    | 'SUPERADMIN'
    | 'COMPANY'
    | 'AUDITOR'
    | 'FARMER'
    | 'LOGISTICS'
    | 'RETAILER'
    | 'GOVERNMENT'
    | 'CONSUMER'
    | 'USER'
    // Legacy values still present in older localStorage sessions
    | 'ADMIN';

export interface User {
    id?: string;
    email: string;
    role: UserRoleString | string;
    display_name?: string;
}

export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('origin_access_token');
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('origin_refresh_token');
}

export function getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem('origin_user');
    if (!userJson) return null;
    try {
        return JSON.parse(userJson);
    } catch {
        return null;
    }
}

export function setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('origin_access_token', accessToken);
    if (refreshToken) {
        localStorage.setItem('origin_refresh_token', refreshToken);
    }
}

export function setUser(user: User) {
    localStorage.setItem('origin_user', JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem('origin_access_token');
    localStorage.removeItem('origin_refresh_token');
    localStorage.removeItem('origin_user');
}

export function isAuthenticated(): boolean {
    return !!getAuthToken();
}

function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {}),
    };
    try {
        return await fetch(url, { ...options, headers });
    } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
            console.warn(`[API] Connection failed to ${url}.`);
        }
        throw err;
    }
}

// ─── Static Data Fetcher ─────────────────────────────────────────
async function fetchStaticPage<T>(entity: string, filter: string, page: number): Promise<PaginatedResponse<T>> {
    const metaUrl = `/data/${entity}/meta.json`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) throw new Error(`Failed to fetch ${metaUrl}`);
    const meta = await metaRes.json();

    const filterKey = filter || 'all';
    const filterInfo = filterKey === 'all'
        ? { total: meta.total, pages: meta.pages }
        : meta.filters[filterKey];

    if (!filterInfo) {
        return { data: [], total: 0, page: 1, totalPages: 1, pageSize: meta.pageSize };
    }

    const clampedPage = Math.max(1, Math.min(page, filterInfo.pages));
    const dataUrl = `/data/${entity}/${filterKey}/${clampedPage}.json`;
    const dataRes = await fetch(dataUrl);
    if (!dataRes.ok) throw new Error(`Failed to fetch ${dataUrl}`);
    const data = await dataRes.json();

    return {
        data: data as T[],
        total: filterInfo.total,
        page: clampedPage,
        totalPages: filterInfo.pages,
        pageSize: meta.pageSize,
    };
}

/**
 * Mock-mode role detection used when the backend is unreachable.
 * Maps an email's local-part prefix or substring to a UserRole. Order matters —
 * more specific prefixes are checked first. `admin@` keeps mapping to SUPERADMIN
 * (formerly 'ADMIN') so existing demo logins stay functional.
 */
function inferMockRole(email: string): UserRoleString {
    const local = email.toLowerCase().split('@')[0] || '';
    if (local.startsWith('superadmin') || local.startsWith('admin')) return 'SUPERADMIN';
    if (local.startsWith('company')) return 'COMPANY';
    if (local.startsWith('farmer')) return 'FARMER';
    if (local.startsWith('logistics')) return 'LOGISTICS';
    if (local.startsWith('auditor')) return 'AUDITOR';
    if (local.startsWith('retailer')) return 'RETAILER';
    if (local.startsWith('government') || local.startsWith('gov')) return 'GOVERNMENT';
    if (local.startsWith('consumer')) return 'CONSUMER';
    return 'USER';
}

const MOCK_ROLE_DISPLAY_NAMES: Partial<Record<UserRoleString, string>> = {
    SUPERADMIN: 'Alex Rivera',
    COMPANY: 'Origin Foods Co.',
    FARMER: 'Priya Patel',
    LOGISTICS: 'Marcus Chen',
    AUDITOR: 'Dr. Sarah Klein',
    RETAILER: 'Whole Harvest Market',
    GOVERNMENT: 'Inspector Rao',
    CONSUMER: 'Jamie Lee',
};

/**
 * Synthesize a deterministic UUID-shaped id from an email so mock-mode users
 * have a stable identifier across reloads. Real backend logins use the id
 * returned in the auth response and bypass this entirely.
 */
function mockUserId(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        hash = (hash * 31 + email.charCodeAt(i)) | 0;
    }
    const hex = (Math.abs(hash).toString(16) + '0'.repeat(32)).slice(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ─── Auth Endpoints ──────────────────────────────────────────────
export async function login(email: string, password: string, totpCode?: string) {
    const body: Record<string, string> = { email, password };
    if (totpCode) body.totp_code = totpCode;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(error.detail || 'Login failed');
        }

        const data = await res.json();
        setTokens(data.access_token, data.refresh_token);
        if (data.user) setUser(data.user);
        return data;
    } catch (err) {
        console.warn('Backend unreachable, using mock login for dev', err);
        const role = inferMockRole(email);
        const mockData = {
            access_token: 'm_dev_token_' + btoa(email),
            refresh_token: 'm_dev_refresh',
            user: {
                id: mockUserId(email),
                email,
                role,
                display_name: MOCK_ROLE_DISPLAY_NAMES[role] || email.split('@')[0]
            }
        };
        setTokens(mockData.access_token, mockData.refresh_token);
        setUser(mockData.user);
        return mockData;
    }
}

export async function register(email: string, password: string, role?: string) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Registration failed' }));
            throw new Error(error.detail || 'Registration failed');
        }

        const data = await res.json();
        setTokens(data.access_token, data.refresh_token);
        if (data.user) setUser(data.user);
        return data;
    } catch (err) {
        console.warn('Backend unreachable, using mock register for dev', err);
        const assignedRole = (role as UserRoleString) || inferMockRole(email);
        const mockData = {
            access_token: 'm_dev_token_' + btoa(email),
            refresh_token: 'm_dev_refresh',
            user: {
                id: mockUserId(email),
                email,
                role: assignedRole,
                display_name: MOCK_ROLE_DISPLAY_NAMES[assignedRole as UserRoleString] || email.split('@')[0]
            }
        };
        setTokens(mockData.access_token, mockData.refresh_token);
        setUser(mockData.user);
        return mockData;
    }
}

export async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) { clearAuth(); return false; }

        const data = await res.json();
        setTokens(data.access_token, data.refresh_token);
        return true;
    } catch {
        clearAuth();
        return false;
    }
}

export async function logout() {
    try {
        await authFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch {
        // Server-side logout is best-effort
    }
    clearAuth();
}

// ─── Stats ───────────────────────────────────────────────────────
export async function fetchStats(): Promise<DatasetStats> {
    if (USE_STATIC_DATA) {
        const res = await fetch('/data/stats.json');
        if (!res.ok) throw new Error('Failed to fetch stats');
        return await res.json();
    }
    // Production: would hit a stats endpoint
    const res = await authFetch(`${API_BASE_URL}/stats`);
    return await res.json();
}

// ─── Shipments ───────────────────────────────────────────────────
export async function fetchShipments(page = 1, filter = ''): Promise<PaginatedResponse<Shipment>> {
    if (USE_STATIC_DATA) {
        return fetchStaticPage<Shipment>('shipments', filter, page);
    }
    try {
        const params = new URLSearchParams({ page: String(page), limit: '100' });
        if (filter) params.set('status', filter);
        const res = await authFetch(`${API_BASE_URL}/shipments?${params}`);
        if (!res.ok) throw new Error('Failed to fetch shipments');
        const data = await res.json();
        return Array.isArray(data)
            ? { data, total: data.length, page: 1, totalPages: 1, pageSize: data.length }
            : data;
    } catch (err) {
        console.error('API connection failed', err);
        return { data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 };
    }
}

export async function createShipment(data: Record<string, unknown>) {
    try {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            const val = data[key];
            if (typeof val === 'string' || val instanceof Blob) {
                formData.append(key, val);
            } else {
                formData.append(key, String(val));
            }
        });

        const res = await authFetch(`${API_BASE_URL}/shipments`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error('Failed to create shipment');
        return await res.json();
    } catch (err) {
        const newShipment = { id: `MOCK-${Math.floor(Math.random() * 1000)}`, ...data, status: 'CREATED', risk_score: 0.1 } as Shipment;
        return newShipment;
    }
}

// ─── Alerts ──────────────────────────────────────────────────────
export async function fetchAlerts(page = 1, filter = ''): Promise<PaginatedResponse<Alert>> {
    if (USE_STATIC_DATA) {
        return fetchStaticPage<Alert>('alerts', filter, page);
    }
    try {
        const res = await authFetch(`${API_BASE_URL}/alerts`);
        if (!res.ok) throw new Error('Failed to fetch alerts');
        const data = await res.json();
        return Array.isArray(data)
            ? { data, total: data.length, page: 1, totalPages: 1, pageSize: data.length }
            : data;
    } catch (err) {
        console.error('API connection failed', err);
        return { data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 };
    }
}

export async function acknowledgeAlert(alertId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to acknowledge alert');
        return await res.json();
    } catch {
        return { success: true, id: alertId };
    }
}

export async function ignoreAlert(alertId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/alerts/${alertId}/ignore`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to ignore alert');
        return await res.json();
    } catch {
        return { success: true, id: alertId };
    }
}

export async function bulkAcknowledgeAlerts(alertIds: string[]) {
    try {
        const res = await authFetch(`${API_BASE_URL}/alerts/bulk-acknowledge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ ids: alertIds }),
        });
        if (!res.ok) throw new Error('Failed to bulk acknowledge');
        return await res.json();
    } catch {
        return { success: true, count: alertIds.length };
    }
}

// ─── Escrow ──────────────────────────────────────────────────────
export async function fetchEscrows(page = 1, filter = ''): Promise<PaginatedResponse<Escrow>> {
    if (USE_STATIC_DATA) {
        return fetchStaticPage<Escrow>('escrows', filter, page);
    }
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows`);
        if (!res.ok) throw new Error('Failed to fetch escrows');
        const data = await res.json();
        return Array.isArray(data)
            ? { data, total: data.length, page: 1, totalPages: 1, pageSize: data.length }
            : data;
    } catch (err) {
        console.error('API unavailable', err);
        return { data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 };
    }
}

export async function settleEscrow(escrowId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/settle`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to settle escrow');
        return await res.json();
    } catch {
        return { success: true, id: escrowId };
    }
}

export async function disputeEscrow(escrowId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/dispute`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to dispute escrow');
        return await res.json();
    } catch {
        return { success: true, id: escrowId };
    }
}

export async function releaseEscrow(escrowId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/release`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to release escrow');
        return await res.json();
    } catch {
        return { success: true, id: escrowId };
    }
}

// ─── Audits ──────────────────────────────────────────────────────
export async function fetchAudits(page = 1, filter = ''): Promise<PaginatedResponse<Audit>> {
    if (USE_STATIC_DATA) {
        return fetchStaticPage<Audit>('audits', filter, page);
    }
    try {
        const res = await authFetch(`${API_BASE_URL}/audits`);
        if (!res.ok) throw new Error('Failed to fetch audits');
        const data = await res.json();
        return Array.isArray(data)
            ? { data, total: data.length, page: 1, totalPages: 1, pageSize: data.length }
            : data;
    } catch (err) {
        console.error('API connection failed', err);
        return { data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 };
    }
}

export async function requestAudit(shipmentId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/audits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ shipment_id: shipmentId }),
        });
        if (!res.ok) throw new Error('Failed to request audit');
        return await res.json();
    } catch {
        return { success: true, shipmentId, auditId: 'MOCK-AUD-999' };
    }
}

// ─── Reports ─────────────────────────────────────────────────────
export async function generateReport(reportType: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/reports/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ type: reportType }),
        });
        if (!res.ok) throw new Error('Failed to generate report');
        return await res.json();
    } catch {
        return { success: true, type: reportType, url: '#' };
    }
}

// ─── Settings / Profile ─────────────────────────────────────────
export async function updateProfile(data: { displayName?: string; email?: string; preferences?: Record<string, boolean> }) {
    try {
        const res = await authFetch(`${API_BASE_URL}/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({
                display_name: data.displayName,
                email: data.email,
                preferences: data.preferences
            }),
        });
        if (!res.ok) throw new Error('Failed to update profile');
        return await res.json();
    } catch {
        return { success: true, ...data };
    }
}

// ─── Global Search ────────────────────────────────────────────────
export interface SearchResults {
    shipments: Shipment[];
    alerts: Alert[];
    audits: Audit[];
}

/**
 * Performs a global search across shipments, alerts, and audits.
 * Scans the first page of each entity for "instant" demo results.
 */
export async function searchEntities(query: string): Promise<SearchResults> {
    const q = query.toLowerCase().trim();
    if (!q || q.length < 2) return { shipments: [], alerts: [], audits: [] };

    try {
        // Fetch first page of each for "instant" global search
        const [shipmentsRes, alertsRes, auditsRes] = await Promise.all([
            fetchShipments(1),
            fetchAlerts(1),
            fetchAudits(1)
        ]);

        const filterShipment = (s: Shipment) => 
            s.id.toLowerCase().includes(q) || 
            s.origin.toLowerCase().includes(q) || 
            s.destination.toLowerCase().includes(q) ||
            (typeof s.product === 'string' && s.product.toLowerCase().includes(q));

        const filterAlert = (a: Alert) => 
            a.id.toLowerCase().includes(q) || 
            a.type.toLowerCase().includes(q) || 
            (a.message?.toLowerCase() || '').includes(q);

        const filterAudit = (a: Audit) => 
            a.id.toLowerCase().includes(q) || 
            a.entity.toLowerCase().includes(q) || 
            a.auditor.toLowerCase().includes(q);

        return {
            shipments: shipmentsRes.data.filter(filterShipment).slice(0, 5),
            alerts: alertsRes.data.filter(filterAlert).slice(0, 5),
            audits: auditsRes.data.filter(filterAudit).slice(0, 5),
        };
    } catch (err) {
        console.error('[Search] Error performing global search', err);
        return { shipments: [], alerts: [], audits: [] };
    }
}

