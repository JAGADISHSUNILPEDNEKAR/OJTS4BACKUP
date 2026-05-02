"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import RequireCapability from '@/components/auth/RequireCapability';
import { fetchStats, DatasetStats } from '@/lib/api';

const RiskHeatmap = dynamic(() => import('@/components/maps/RiskHeatmap'), { ssr: false });

export default function AnalyticsPage() {
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [activeTimeframe, setActiveTimeframe] = useState('30d');

    useEffect(() => {
        fetchStats().then(setStats).catch(console.error);
    }, []);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));

    const handleExportData = () => {
        if (!stats) return;
        const csvContent = [
            'Metric,Value',
            `Total Shipments,${stats.totalShipments}`,
            `Total Alerts,${stats.totalAlerts}`,
            `Avg Risk Score,${(stats.avgRiskScore * 100).toFixed(2)}%`,
            `Fraud Count,${stats.fraudCount}`,
            `Temp Violations,${stats.tempViolations}`,
            `Route Deviations,${stats.routeDeviations}`,
            `Origin Mismatches,${stats.originMismatches}`,
            `Passed Audits,${stats.passedAudits}`,
            `Failed Audits,${stats.failedAudits}`,
            '',
            'Category,Count',
            ...stats.topCategories.map(c => `${c.name},${c.count}`),
            '',
            'Region,Count',
            ...Object.entries(stats.regionCounts).map(([k, v]) => `${k},${v}`),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analytics_export.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

    // Derive feature importance from real data
    const featureImportance = stats ? [
        { label: 'Origin Mismatch Detection', value: stats.originMismatches > 0 ? Math.round((stats.originMismatches / stats.totalShipments) * 100 * 10) : 0 },
        { label: 'Route Deviation Score', value: stats.routeDeviations > 0 ? Math.round((stats.routeDeviations / stats.totalShipments) * 100) : 0 },
        { label: 'Temperature Stability', value: stats.tempViolations > 0 ? Math.round((1 - stats.tempViolations / stats.totalShipments) * 100) : 100 },
        { label: 'Fraud Detection Rate', value: stats.fraudCount > 0 ? Math.round((stats.fraudCount / stats.totalShipments) * 100) : 0 },
        { label: 'Compliance Score', value: stats.passedAudits > 0 ? Math.round((stats.passedAudits / stats.totalShipments) * 100) : 0 },
    ] : [];

    // Status distribution for bar chart
    const statusEntries = stats ? Object.entries(stats.statusCounts).sort((a, b) => b[1] - a[1]) : [];
    const maxStatusCount = statusEntries.length > 0 ? statusEntries[0][1] : 1;

    return (
        <DashboardLayout
            title="Predictive Analytics & Intelligence"
            description="High-fidelity risk modeling and global supply chain intelligence."
        >
            <RequireCapability cap="nav.analytics" featureLabel="Analytics">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Dataset Records', value: stats ? fmt(stats.totalShipments) : '—', change: '100%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
                    { label: 'Anomalies Detected', value: stats ? fmt(stats.totalAlerts) : '—', change: `${stats ? ((stats.criticalAlerts / stats.totalAlerts) * 100).toFixed(0) : 0}% critical`, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
                    { label: 'Avg Risk Score', value: stats ? `${(stats.avgRiskScore * 100).toFixed(2)}%` : '—', change: 'across all records', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
                ].map((stat, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-primary)', color: 'var(--primary)' }}>
                            {stat.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p className="text-muted" style={{ fontWeight: 600, margin: 0 }}>{stat.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{stat.value}</h3>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)' }}>{stat.change}</span>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Status Distribution Chart */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Shipment Status Distribution</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['7d', '14d', '30d', '90d'].map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setActiveTimeframe(tf)}
                                        style={{
                                            padding: '0.25rem 0.5rem', fontSize: '0.7rem', fontWeight: activeTimeframe === tf ? 700 : 500,
                                            background: activeTimeframe === tf ? 'var(--primary)' : 'transparent',
                                            color: activeTimeframe === tf ? 'white' : 'var(--text-muted)',
                                            border: activeTimeframe === tf ? 'none' : '1px solid var(--border-light)',
                                            borderRadius: '4px', cursor: 'pointer', transition: 'all var(--transition-fast)'
                                        }}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {statusEntries.map(([status, count], i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                                    <span style={{ fontWeight: 600 }}>{status}</span>
                                    <span style={{ fontWeight: 700 }}>{count.toLocaleString()} ({((count / stats!.totalShipments) * 100).toFixed(1)}%)</span>
                                </div>
                                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(count / maxStatusCount) * 100}%`,
                                        background: status === 'DELAYED' ? 'var(--danger)' : status === 'IN_TRANSIT' ? 'var(--primary)' : status === 'DELIVERED' ? 'var(--secondary)' : 'var(--warning)',
                                        borderRadius: '4px',
                                        transition: 'width 0.5s ease'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={handleExportData}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export Data
                        </button>
                    </div>
                </div>

                {/* ML Feature Importance */}
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>ML Feature Analysis</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {featureImportance.map((feat, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                                    <span style={{ fontWeight: 600 }}>{feat.label}</span>
                                    <span style={{ fontWeight: 700 }}>{feat.value}%</span>
                                </div>
                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                                    <div style={{ height: '100%', width: `${Math.min(feat.value, 100)}%`, background: 'var(--primary)', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Categories */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Top Product Categories</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '1rem' }}>
                    {stats?.topCategories.map((cat, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>{cat.count.toLocaleString()}</p>
                            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>{cat.name}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Geographical Risk Heatmap */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem 0 1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Geographical Risk Heatmap</h3>
                    <span style={{ fontSize: 'clamp(0.65rem, 2vw, 0.75rem)', color: 'var(--text-muted)' }}>Zoom: {Math.round(zoomLevel * 100)}%</span>
                </div>
                <div style={{ height: '450px', position: 'relative' }}>
                    <RiskHeatmap stats={stats} zoomLevel={zoomLevel} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
                </div>
            </div>
            </RequireCapability>
        </DashboardLayout>
    );
}
