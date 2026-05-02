"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchShipments, createShipment, requestAudit, getCurrentUser, Shipment } from '@/lib/api';

const ANON_FARMER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Dashboard view for the FARMER role.
 * Focus: crop & yield management, asset registration, compliance tracking.
 */
export default function FarmerDashboard() {
    const router = useRouter();
    const [myShipments, setMyShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await fetchShipments(1);
                setMyShipments(result.data.slice(0, 8));
            } catch (err) {
                console.error('Failed to load farmer data', err);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const handleLogHarvest = async () => {
        try {
            const newShipment = await createShipment({
                farmer_id: getCurrentUser()?.id || ANON_FARMER_ID,
                destination: 'Cooperative Buyer',
            });
            alert(`Harvest logged: ${newShipment.id}`);
        } catch {
            alert('Failed to log harvest');
        }
    };

    const handleRegisterAsset = async () => {
        try {
            const newShipment = await createShipment({
                farmer_id: getCurrentUser()?.id || ANON_FARMER_ID,
                destination: 'On-Farm Storage',
            });
            alert(`Asset registered: ${newShipment.id}`);
        } catch {
            alert('Failed to register asset');
        }
    };

    const handleRequestAudit = async () => {
        if (myShipments.length === 0) {
            alert('No shipments available to audit');
            return;
        }
        const result = await requestAudit(myShipments[0].id);
        alert(`Audit requested for: ${result.shipmentId}`);
    };

    // Demo metrics — Phase 1 metric keys (Soil Health, Harvest Yield, Compliance Score).
    // Phase 6+ will hook these to real telemetry once the farm-IoT endpoint is live.
    const metrics = [
        { label: 'Soil Health', value: '87 / 100', delta: '+3 pts this week', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg> },
        { label: 'Harvest Yield', value: '4.2t / acre', delta: '+11% YoY', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M5 9l7-7 7 7M5 15l7 7 7-7"></path></svg> },
        { label: 'Compliance Score', value: '96%', delta: 'All certs current', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
        { label: 'Active Lots', value: loading ? '—' : myShipments.length.toString(), delta: 'In transit / storage', tone: 'neutral',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> },
    ];

    const primaryActions = [
        { title: 'Log Harvest', desc: 'Record a new yield batch', action: handleLogHarvest,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20"></path></svg> },
        { title: 'Register Asset', desc: 'Onboard equipment or land plot', action: handleRegisterAsset,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> },
        { title: 'Request Audit', desc: 'Trigger compliance review', action: handleRequestAudit,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
    ];

    return (
        <DashboardLayout
            title="Farm Operations"
            description="Crop performance, harvest tracking, and compliance overview."
        >
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {metrics.map((card, i) => (
                    <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'var(--bg-primary)', color: card.tone === 'good' ? 'var(--secondary)' : 'var(--text-muted)' }}>
                                {card.icon}
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: card.tone === 'good' ? 'var(--secondary)' : 'var(--text-muted)' }}>
                                {card.delta}
                            </span>
                        </div>
                        <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{card.label}</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{card.value}</h3>
                    </div>
                ))}
            </div>

            {/* Primary Actions + My Lots */}
            <style jsx>{`@media (min-width: 900px) { .farmer-grid { grid-template-columns: 340px 1fr !important; } }`}</style>
            <div className="farmer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Primary Actions */}
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {primaryActions.map((item, i) => (
                            <div key={i} onClick={item.action}
                                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                <div style={{ color: 'var(--primary)' }}>{item.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>{item.title}</p>
                                    <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                                </div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Lots Table */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>My Lots</h3>
                        <button onClick={() => router.push('/shipments')} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View All ↗</button>
                    </div>
                    <div className="table-container"><table>
                        <thead>
                            <tr>
                                <th>Lot ID</th>
                                <th>Destination</th>
                                <th>Status</th>
                                <th className="hide-on-mobile">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading lots...</td></tr>
                            ) : myShipments.map((row) => (
                                <tr key={row.id} className="shipment-row" style={{ cursor: 'pointer' }} onClick={() => router.push('/shipments')}>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.destination?.split(',')[0]}</td>
                                    <td><span className={`badge ${row.status === 'DELAYED' ? 'badge-danger' : row.status === 'CREATED' ? 'badge-warning' : row.status === 'DELIVERED' ? 'badge-success' : 'badge-primary'}`}>{row.status}</span></td>
                                    <td className="hide-on-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '--'}</td>
                                </tr>
                            ))}
                            {!loading && myShipments.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No lots yet. Log your first harvest above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table></div>
                </div>
            </div>
        </DashboardLayout>
    );
}
