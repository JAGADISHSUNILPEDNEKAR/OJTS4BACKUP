/**
 * API Client for connecting to the local Origin backend services.
 * In a real production environment, this would hit the API Gateway (e.g., Nginx Ingress).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/v1';
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || true; // Default to true if backend is unreachable

// ─── Mock Data ───────────────────────────────────────────────────
const MOCK_SHIPMENTS: Shipment[] = [
    { id: 'SHP-7721-09', origin: 'Mombasa, KE', destination: 'Rotterdam, NL', farmer_id: 'F-882', status: 'IN_TRANSIT', risk_score: 0.12 },
    { id: 'SHP-8812-44', origin: 'Santos, BR', destination: 'Shanghai, CN', farmer_id: 'F-102', status: 'CREATED', risk_score: 0.05 },
    { id: 'SHP-9903-12', origin: 'Ho Chi Minh, VN', destination: 'Los Angeles, US', farmer_id: 'F-441', status: 'DELAYED', risk_score: 0.88 },
    { id: 'SHP-1120-55', origin: 'Abidjan, CI', destination: 'Hamburg, DE', farmer_id: 'F-309', status: 'ARRIVED', risk_score: 0.02 },
];

const MOCK_ALERTS: Alert[] = [
    { id: 'ALT-001', shipment_id: 'SHP-9903-12', severity: 'CRITICAL', type: 'TEMPERATURE_ANOMALY', timestamp: new Date().toISOString(), status: 'OPEN', message: 'Temperature exceeded threshold (12°C)' },
    { id: 'ALT-002', shipment_id: 'SHP-7721-09', severity: 'WARNING', type: 'ROUTE_DEVIATION', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'OPEN', message: 'Vessel off course by 12 nautical miles' },
];

const MOCK_ESCROWS = [
    { id: 'ESC-441', shipment_id: 'SHP-7721-09', amount: '1.25 BTC', status: 'HELD', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
    { id: 'ESC-882', shipment_id: 'SHP-8812-44', amount: '0.88 BTC', status: 'RELEASED', address: 'bc1p5d8l0v38z0aadcsas39q278f8v9k6p5f1b1c' },
];

const MOCK_AUDITS = [
    { id: 'AUD-101', shipment_id: 'SHP-1120-55', status: 'VERIFIED', proof_hash: '0x7e8c9d...f0a1', timestamp: new Date().toISOString() },
    { id: 'AUD-102', shipment_id: 'SHP-7721-09', status: 'PENDING', proof_hash: null, timestamp: new Date().toISOString() },
];


// ─── Auth Helpers ────────────────────────────────────────────────
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('origin_access_token');
}

export function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('origin_refresh_token');
}

export function setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('origin_access_token', accessToken);
    if (refreshToken) {
        localStorage.setItem('origin_refresh_token', refreshToken);
    }
}

export function clearTokens() {
    localStorage.removeItem('origin_access_token');
    localStorage.removeItem('origin_refresh_token');
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
    return fetch(url, { ...options, headers });
}

// ─── Auth Endpoints ──────────────────────────────────────────────
export async function login(email: string, password: string, totpCode?: string) {
    const body: Record<string, string> = { email, password };
    if (totpCode) body.totp_code = totpCode;

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
    return data;
}

export async function register(email: string, password: string, role?: string) {
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
    return data;
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

        if (!res.ok) {
            clearTokens();
            return false;
        }

        const data = await res.json();
        setTokens(data.access_token, data.refresh_token);
        return true;
    } catch {
        clearTokens();
        return false;
    }
}

export async function logout() {
    try {
        await authFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch {
        // Server-side logout is best-effort
    }
    clearTokens();
}

// ─── Shipments ───────────────────────────────────────────────────
export interface Shipment {
    id: string;
    origin: string;
    destination: string;
    farmer_id: string;
    status: string;
    risk_score?: number;
    [key: string]: unknown;
}

export async function fetchShipments(): Promise<Shipment[]> {
    try {
        const res = await authFetch(`${API_BASE_URL}/shipments`);
        if (!res.ok) throw new Error('Failed to fetch shipments');
        return res.json();
    } catch (err) {
        console.error('API connection failed', err);
        return [];
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
        return res.json();
    } catch (err) {
        console.error('Failed to create shipment', err);
        throw err;
    }
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

export async function fetchAlerts(): Promise<Alert[]> {
    try {
        const res = await authFetch(`${API_BASE_URL}/alerts`);
        if (!res.ok) throw new Error('Failed to fetch alerts');
        return res.json();
    } catch (err) {
        console.error('API connection failed', err);
        return [];
    }
}

export async function acknowledgeAlert(alertId: string) {
    const res = await authFetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to acknowledge alert');
    return res.json();
}

export async function ignoreAlert(alertId: string) {
    const res = await authFetch(`${API_BASE_URL}/alerts/${alertId}/ignore`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to ignore alert');
    return res.json();
}

export async function bulkAcknowledgeAlerts(alertIds: string[]) {
    const res = await authFetch(`${API_BASE_URL}/alerts/bulk-acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ ids: alertIds }),
    });
    if (!res.ok) throw new Error('Failed to bulk acknowledge');
    return res.json();
}

// ─── Escrow ──────────────────────────────────────────────────────
export async function fetchEscrows() {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows`);
        if (!res.ok) throw new Error('Failed to fetch escrows');
        return res.json();
    } catch (err) {
        console.error('API unavailable, failed to fetch escrows', err);
        throw err;
    }
}

export async function settleEscrow(escrowId: string) {
    const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/settle`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to settle escrow');
    return res.json();
}

export async function disputeEscrow(escrowId: string) {
    const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/dispute`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to dispute escrow');
    return res.json();
}

export async function releaseEscrow(escrowId: string) {
    const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/release`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to release escrow');
    return res.json();
}

// ─── Audits ──────────────────────────────────────────────────────
export async function fetchAudits() {
    const res = await authFetch(`${API_BASE_URL}/audits`);
    if (!res.ok) throw new Error('Failed to fetch audits');
    return res.json();
}

export async function requestAudit(shipmentId: string) {
    const res = await authFetch(`${API_BASE_URL}/audits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ shipment_id: shipmentId }),
    });
    if (!res.ok) throw new Error('Failed to request audit');
    return res.json();
}

// ─── Reports ─────────────────────────────────────────────────────
export async function generateReport(reportType: string) {
    const res = await authFetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ type: reportType }),
    });
    if (!res.ok) throw new Error('Failed to generate report');
    return res.json();
}

// ─── Settings / Profile ─────────────────────────────────────────
export async function updateProfile(data: { displayName?: string; email?: string; preferences?: Record<string, boolean> }) {
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
    return res.json();
}
