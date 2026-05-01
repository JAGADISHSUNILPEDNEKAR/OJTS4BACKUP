"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchStats, generateReport, DatasetStats } from '@/lib/api';

/**
 * Dashboard view for the GOVERNMENT role.
 * Focus: macro oversight — food security, trade volume, regional anomalies.
 */
export default function GovernmentDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                setStats(await fetchStats());
            } catch (err) {
                console.error('Failed to load government data', err);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    const handleExportReports = async () => {
        try {
            await generateReport('quarterly_oversight');
            alert('Quarterly oversight report queued. Opening Reports…');
            router.push('/reports');
        } catch {
            alert('Failed to queue report');
        }
    };

    const handleIssueAlert = () => {
        alert('Issue Region-wide Alert — broadcasts to operators in the selected jurisdiction.');
    };

    const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

    const metrics = [
        { label: 'Food Security Index', value: '78 / 100', delta: '+2 vs last quarter', tone: 'good',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
        { label: 'Trade Volume', value: stats ? `${fmt(stats.totalShipments)} shipments` : '—', delta: 'Tracked this period', tone: 'neutral',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg> },
        { label: 'Critical Anomalies', value: stats ? fmt(stats.criticalAlerts) : '—', delta: 'Cross-region', tone: 'warn',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> },
        { label: 'Origin Mismatches', value: stats ? fmt(stats.originMismatches) : '—', delta: 'Investigation queue', tone: 'danger',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> },
    ];

    const primaryActions = [
        { title: 'Export Reports', desc: 'Quarterly oversight bundle', action: handleExportReports,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> },
        { title: 'Issue Region Alert', desc: 'Broadcast to operators in jurisdiction', action: handleIssueAlert,
          icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> },
    ];

    const toneColor = (tone: string) =>
        tone === 'good' ? 'var(--secondary)' :
        tone === 'warn' ? 'var(--warning)' :
        tone === 'danger' ? 'var(--danger)' : 'var(--primary)';

    const topRegions = stats
        ? Object.entries(stats.regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
        : [];

    return (
        <DashboardLayout
            title="Macro Oversight"
            description="Cross-region trade volume, anomaly hotspots, and regulatory reporting."
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

            <style jsx>{`@media (min-width: 900px) { .gov-grid { grid-template-columns: 340px 1fr !important; } }`}</style>
            <div className="gov-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>Regulatory Tools</h3>
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
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Top Regions by Volume</h3>
                        <button onClick={() => router.push('/analytics')} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Open Analytics ↗</button>
                    </div>
                    {loading ? (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading regional data...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {topRegions.map(([region, count]) => {
                                const max = topRegions[0]?.[1] || 1;
                                const pct = (count / max) * 100;
                                return (
                                    <div key={region}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{region}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(count)}</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: '3px' }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {topRegions.length === 0 && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>No regional data.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
