"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchShipments, Shipment } from '@/lib/api';

/**
 * Dashboard view for the RETAILER role.
 * Focus: inbound batches, freshness windows, stock acceptance + sales recording.
 */
export default function RetailerDashboard() {
    const router = useRouter();
    const [inbound, setInbound] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await fetchShipments(1);
                setInbound(result.data.slice(0, 8));
            } catch (err) {
                console.error('Failed to load retailer data', err);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const handleAcceptBatch = () => {
        alert('Accept Batch — confirms custody and unlocks payment escrow.');
    };

    const handleRecordSale = () => {
        alert('Record Sale — logs unit movement and updates shelf-life signals.');
    };

    const metrics = [
        { label: 'Avg Shelf Life', value: '6.2 days', delta: 'Across active SKUs', tone: 'neutral',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
        { label: 'Stock Levels', value: '82%', delta: '+4% above target', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="6" width="20" height="12" rx="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg> },
        { label: 'Inbound Transit', value: loading ? '—' : inbound.length.toString(), delta: 'Arriving today', tone: 'neutral',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> },
        { label: 'Spoilage Rate', value: '1.4%', delta: '−0.6% vs last month', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg> },
    ];

    const primaryActions = [
        { title: 'Accept Batch', desc: 'Confirm custody on inbound shipment', action: handleAcceptBatch,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> },
        { title: 'Record Sale', desc: 'Log unit movement at point-of-sale', action: handleRecordSale,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
    ];

    const toneColor = (tone: string) =>
        tone === 'good' ? 'var(--secondary)' :
        tone === 'warn' ? 'var(--warning)' :
        tone === 'danger' ? 'var(--danger)' : 'var(--primary)';

    return (
        <DashboardLayout
            title="Inventory & Freshness"
            description="Inbound stock, shelf-life signals, and point-of-sale activity."
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {metrics.map((card, i) => (
                    <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'var(--bg-primary)', color: toneColor(card.tone) }}>
                                {card.icon}
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: toneColor(card.tone) }}>
                                {card.delta}
                            </span>
                        </div>
                        <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{card.label}</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{card.value}</h3>
                    </div>
                ))}
            </div>

            <style jsx>{`@media (min-width: 900px) { .retailer-grid { grid-template-columns: 340px 1fr !important; } }`}</style>
            <div className="retailer-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>Storefront Actions</h3>
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
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Inbound Shipments</h3>
                        <button onClick={() => router.push('/shipments')} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View All ↗</button>
                    </div>
                    <div className="table-container"><table>
                        <thead>
                            <tr>
                                <th>Batch</th>
                                <th>Origin</th>
                                <th>Status</th>
                                <th className="hide-on-mobile">ETA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading inbound...</td></tr>
                            ) : inbound.map((row) => (
                                <tr key={row.id} className="shipment-row" style={{ cursor: 'pointer' }} onClick={() => router.push('/shipments')}>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.origin?.split(',')[0]}</td>
                                    <td><span className={`badge ${row.status === 'DELAYED' ? 'badge-danger' : row.status === 'CREATED' ? 'badge-warning' : row.status === 'DELIVERED' ? 'badge-success' : 'badge-primary'}`}>{row.status}</span></td>
                                    <td className="hide-on-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '--'}</td>
                                </tr>
                            ))}
                            {!loading && inbound.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No inbound batches.</td></tr>
                            )}
                        </tbody>
                    </table></div>
                </div>
            </div>
        </DashboardLayout>
    );
}
