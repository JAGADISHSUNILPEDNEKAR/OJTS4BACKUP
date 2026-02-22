/**
 * API Client for connecting to the local Origin backend services.
 * In a real production environment, this would hit the API Gateway (e.g., Nginx Intress).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchShipments() {
    // Placeholder structure mirroring the expected backend response
    try {
        const res = await fetch(`${API_BASE_URL}/shipments`, { next: { revalidate: 30 } });
        if (!res.ok) throw new Error('Failed to fetch shipments');
        return res.json();
    } catch (err) {
        console.error('API connection failed, using dummy data', err);
        return [];
    }
}

export async function fetchAlerts() {
    try {
        const res = await fetch(`${API_BASE_URL}/alerts`, { next: { revalidate: 10 } });
        if (!res.ok) throw new Error('Failed to fetch alerts');
        return res.json();
    } catch (err) {
        console.error('API connection failed, using dummy data', err);
        return [];
    }
}
