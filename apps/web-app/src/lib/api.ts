/**
 * API Client for connecting to the local Origin backend services.
 * In a real production environment, this would hit the API Gateway (e.g., Nginx Ingress).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/v1';

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
    try {
        const res = await authFetch(`${API_BASE_URL}/alerts/${alertId}/acknowledge`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to acknowledge alert');
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating acknowledge for:', alertId);
        return { id: alertId, status: 'Acknowledged' };
    }
}

export async function ignoreAlert(alertId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/alerts/${alertId}/ignore`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to ignore alert');
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating ignore for:', alertId);
        return { id: alertId, status: 'Ignored' };
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
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating bulk acknowledge');
        return { acknowledged: alertIds.length };
    }
}

// ─── Escrow ──────────────────────────────────────────────────────
export async function fetchEscrows() {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows`);
        if (!res.ok) throw new Error('Failed to fetch escrows');
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, returning mock escrow data');
        return [
            { id: 'ESC-8842', counterparty: 'GlobalAgri Ltd.', value: '1.2 BTC', status: 'Locked', date: 'Oct 24, 2024', risk: 8 },
            { id: 'ESC-8841', counterparty: 'TerraLogistics', value: '0.85 BTC', status: 'Partially Released', date: 'Oct 23, 2024', risk: 12 },
            { id: 'ESC-8840', counterparty: 'PacOcean Corp', value: '2.5 BTC', status: 'Settled', date: 'Oct 22, 2024', risk: 4 },
            { id: 'ESC-8839', counterparty: 'EuroProduce', value: '0.4 BTC', status: 'Disputed', date: 'Oct 22, 2024', risk: 78 },
            { id: 'ESC-8838', counterparty: 'SinoTrans', value: '3.2 BTC', status: 'Locked', date: 'Oct 21, 2024', risk: 15 },
            { id: 'ESC-8837', counterparty: 'NordicTrade', value: '1.1 BTC', status: 'Settled', date: 'Oct 20, 2024', risk: 2 },
        ];
    }
}

export async function settleEscrow(escrowId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/settle`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to settle escrow');
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating settle for:', escrowId);
        return { id: escrowId, status: 'Settled' };
    }
}

export async function disputeEscrow(escrowId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/dispute`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to dispute escrow');
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating dispute for:', escrowId);
        return { id: escrowId, status: 'Disputed' };
    }
}

export async function releaseEscrow(escrowId: string) {
    try {
        const res = await authFetch(`${API_BASE_URL}/escrows/${escrowId}/release`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to release escrow');
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating release for:', escrowId);
        return { id: escrowId, status: 'Released' };
    }
}

// ─── Audits ──────────────────────────────────────────────────────
export async function fetchAudits() {
    try {
        const res = await authFetch(`${API_BASE_URL}/audits`);
        if (!res.ok) throw new Error('Failed to fetch audits');
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, returning mock audit data');
        return [
            { id: 'AUD-1021', entity: 'STR-8812', type: 'Route Compliance', auditor: 'ComplianceBot v2', status: 'Passed', timestamp: '2024-10-24T14:30:00Z', findings: 0 },
            { id: 'AUD-1020', entity: 'ESC-8839', type: 'Financial Reconciliation', auditor: 'Alex Rivera', status: 'Failed', timestamp: '2024-10-24T12:15:00Z', findings: 3 },
            { id: 'AUD-1019', entity: 'STR-8810', type: 'Sensor Calibration', auditor: 'IoT Validator', status: 'Passed', timestamp: '2024-10-23T18:00:00Z', findings: 0 },
            { id: 'AUD-1018', entity: 'STR-7721', type: 'Cold Chain Integrity', auditor: 'Sarah Chen', status: 'Warning', timestamp: '2024-10-23T09:30:00Z', findings: 1 },
            { id: 'AUD-1017', entity: 'ESC-8840', type: 'Settlement Verification', auditor: 'FinOps Bot', status: 'Passed', timestamp: '2024-10-22T16:45:00Z', findings: 0 },
            { id: 'AUD-1016', entity: 'STR-6650', type: 'Geofence Compliance', auditor: 'ComplianceBot v2', status: 'Failed', timestamp: '2024-10-22T11:20:00Z', findings: 2 },
        ];
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
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating audit request for:', shipmentId);
        return { status: 'AUDIT_REQUESTED', shipmentId };
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
        return res.json();
    } catch (err) {
        void err;
        console.warn('API unavailable, simulating report generation');
        return { id: `RPT-${Date.now()}`, type: reportType, status: 'Generated', url: '#' };
    }
}

// ─── Settings / Profile ─────────────────────────────────────────
export async function updateProfile(data: { displayName: string; email: string }) {
    try {
        const res = await authFetch(`${API_BASE_URL}/users/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update profile');
        return res.json();
    } catch (err) {
        console.warn('API unavailable, simulating profile update');
        return { ...data, status: 'saved' };
    }
}
