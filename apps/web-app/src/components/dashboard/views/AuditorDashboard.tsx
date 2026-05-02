"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchAudits, fetchStats, Audit, DatasetStats } from '@/lib/api';

/**
 * Dashboard view for the AUDITOR role.
 * Focus: pending verifications, trust scoring, Merkle proof validity.
 */
export default function AuditorDashboard() {
    const router = useRouter();
    const [pending, setPending] = useState<Audit[]>([]);
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [auditsData, statsData] = await Promise.all([
                    fetchAudits(1),
                    fetchStats(),
                ]);
                setPending(auditsData.data.slice(0, 8));
                setStats(statsData);
            } catch (err) {
                console.error('Failed to load auditor data', err);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const handleVerifyManifest = () => {
        alert('Manifest verifier — paste shipment ID or scan QR to validate Merkle proof.');
    };

    const handleStartInspection = () => {
        router.push('/audits');
    };

    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

    const metrics = [
        { label: 'Pending Audits', value: stats ? fmt(stats.pendingAudits) : '—', delta: 'Awaiting review', tone: 'warn',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
        { label: 'Trust Score', value: stats ? `${stats.trustScore}%` : '—', delta: 'Pass rate', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
        { label: 'Proof Validity', value: stats ? `${stats.proofValidity}%` : '—', delta: 'Merkle anchor success', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 4 12 14.01 9 11.01"></polyline><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path></svg> },
        { label: 'Failed Audits', value: stats ? fmt(stats.failedAudits) : '—', delta: 'Requires escalation', tone: 'danger',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> },
    ];

    const primaryActions = [
        { title: 'Verify Manifest', desc: 'Cross-check Merkle proof', action: handleVerifyManifest,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 4 12 14.01 9 11.01"></polyline><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path></svg> },
        { title: 'Start Inspection', desc: 'Open audit workspace', action: handleStartInspection,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
    ];

    const toneColor = (tone: string) =>
        tone === 'good' ? 'var(--secondary)' :
        tone === 'warn' ? 'var(--warning)' :
        tone === 'danger' ? 'var(--danger)' : 'var(--primary)';

    return (
        <DashboardLayout
            title="Compliance Verification"
            description="Pending audits, Merkle proof integrity, and inspector workflow."
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

            <style jsx>{`@media (min-width: 900px) { .auditor-grid { grid-template-columns: 340px 1fr !important; } }`}</style>
            <div className="auditor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>Inspection Tools</h3>
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
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Pending Audit Queue</h3>
                        <button onClick={() => router.push('/audits')} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Open Workspace ↗</button>
                    </div>
                    <div className="table-container"><table>
                        <thead>
                            <tr>
                                <th>Audit ID</th>
                                <th>Shipment</th>
                                <th>Type</th>
                                <th className="hide-on-mobile">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading audits...</td></tr>
                            ) : pending.map((row) => (
                                <tr key={row.id} className="shipment-row" style={{ cursor: 'pointer' }} onClick={() => router.push('/audits')}>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.shipment_id}</td>
                                    <td style={{ fontSize: '0.75rem' }}>{row.type}</td>
                                    <td className="hide-on-mobile">
                                        <span className={`badge ${row.status === 'FAILED' ? 'badge-danger' : row.status === 'PASSED' ? 'badge-success' : 'badge-warning'}`}>
                                            {row.status || 'PENDING'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {!loading && pending.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No audits in queue.</td></tr>
                            )}
                        </tbody>
                    </table></div>
                </div>
            </div>
        </DashboardLayout>
    );
}
