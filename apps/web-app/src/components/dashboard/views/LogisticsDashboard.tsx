"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchShipments, fetchStats, Shipment, DatasetStats } from '@/lib/api';

/**
 * Dashboard view for the LOGISTICS role.
 * Focus: fleet status, route progress, handover scanning.
 */
export default function LogisticsDashboard() {
    const router = useRouter();
    const [inTransit, setInTransit] = useState<Shipment[]>([]);
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [shipmentsData, statsData] = await Promise.all([
                    fetchShipments(1, 'IN_TRANSIT'),
                    fetchStats(),
                ]);
                setInTransit(shipmentsData.data.slice(0, 8));
                setStats(statsData);
            } catch (err) {
                console.error('Failed to load logistics data', err);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const handleUpdateGPS = () => {
        alert('GPS update interface — opens scanner on the mobile app.');
    };

    const handleScanHandover = () => {
        alert('Custodian handover scanner — opens QR/NFC reader on the mobile app.');
    };

    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

    const metrics = [
        { label: 'On-time Delivery', value: '94.2%', delta: '+1.8% vs last week', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
        { label: 'Fuel Efficiency', value: '7.4 km/L', delta: '+0.3 vs fleet avg', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="22" x2="15" y2="22"></line><line x1="4" y1="9" x2="14" y2="9"></line><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"></path><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"></path></svg> },
        { label: 'Anomalies (24h)', value: stats ? fmt(stats.tempViolations + stats.routeDeviations) : '—', delta: 'Temp + route deviations', tone: 'warn',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> },
        { label: 'Active Routes', value: loading ? '—' : inTransit.length.toString(), delta: 'In transit now', tone: 'neutral',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="10" r="3"></circle><path d="M12 2a8 8 0 0 0-8 8c0 4.4 8 12 8 12s8-7.6 8-12a8 8 0 0 0-8-8z"></path></svg> },
    ];

    const primaryActions = [
        { title: 'Update GPS', desc: 'Refresh route checkpoint', action: handleUpdateGPS,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="10" r="3"></circle><path d="M12 2a8 8 0 0 0-8 8c0 4.4 8 12 8 12s8-7.6 8-12a8 8 0 0 0-8-8z"></path></svg> },
        { title: 'Scan Handover', desc: 'Custody transfer with ECDSA signing', action: handleScanHandover,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    ];

    return (
        <DashboardLayout
            title="Fleet & Routing"
            description="Live custody handovers, route progress, and anomaly tracking."
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {metrics.map((card, i) => (
                    <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'var(--bg-primary)', color: card.tone === 'good' ? 'var(--secondary)' : card.tone === 'warn' ? 'var(--warning)' : 'var(--primary)' }}>
                                {card.icon}
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: card.tone === 'good' ? 'var(--secondary)' : card.tone === 'warn' ? 'var(--warning)' : 'var(--text-muted)' }}>
                                {card.delta}
                            </span>
                        </div>
                        <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{card.label}</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{card.value}</h3>
                    </div>
                ))}
            </div>

            <style jsx>{`@media (min-width: 900px) { .logistics-grid { grid-template-columns: 340px 1fr !important; } }`}</style>
            <div className="logistics-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>Field Actions</h3>
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

                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Active Custody Chain</h3>
                        <button onClick={() => router.push('/shipments')} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View All ↗</button>
                    </div>
                    <div className="table-container"><table>
                        <thead>
                            <tr>
                                <th>Shipment</th>
                                <th>Origin → Destination</th>
                                <th>Status</th>
                                <th className="hide-on-mobile">Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading routes...</td></tr>
                            ) : inTransit.map((row) => (
                                <tr key={row.id} className="shipment-row" style={{ cursor: 'pointer' }} onClick={() => router.push('/shipments')}>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                                    <td style={{ fontSize: '0.75rem' }}>
                                        <span style={{ fontWeight: 600 }}>{row.origin?.split(',')[0]}</span>
                                        <span style={{ color: 'var(--text-muted)', margin: '0 0.25rem' }}>→</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{row.destination?.split(',')[0]}</span>
                                    </td>
                                    <td><span className={`badge ${row.status === 'DELAYED' ? 'badge-danger' : row.status === 'CREATED' ? 'badge-warning' : row.status === 'DELIVERED' ? 'badge-success' : 'badge-primary'}`}>{row.status}</span></td>
                                    <td className="hide-on-mobile" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{((row.risk_score || 0) * 100).toFixed(0)}%</td>
                                </tr>
                            ))}
                            {!loading && inTransit.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No active routes.</td></tr>
                            )}
                        </tbody>
                    </table></div>
                </div>
            </div>
        </DashboardLayout>
    );
}
