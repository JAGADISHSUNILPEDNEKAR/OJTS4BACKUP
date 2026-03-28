"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getCurrentUser } from '@/lib/api';

export default function AnalyticsPage() {
    const router = useRouter();
    const [zoomLevel, setZoomLevel] = useState(1);
    const [activeTimeframe, setActiveTimeframe] = useState('30d');

    useEffect(() => {
        const user = getCurrentUser();
        if (user && user.role !== 'ADMIN') {
            router.replace('/');
        }
    }, [router]);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));

    const handleExportData = () => {
        const csvContent = [
            'Date,Predicted_Risk,Actual_Risk',
            'Oct 01,12.4,11.8',
            'Oct 08,14.2,15.1',
            'Oct 15,11.8,12.0',
            'Oct 22,16.5,15.8',
            'Oct 31,13.1,13.4',
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'analytics_export.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleRefresh = () => {
        alert('Analytics data refreshed');
    };

    return (
        <DashboardLayout
            title="Predictive Analytics & Intelligence"
            description="High-fidelity risk modeling and global supply chain intelligence."
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Model Accuracy', value: '98.2%', change: '+0.4%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
                    { label: 'Anomalies Prevented', value: '1,284', change: '+18.2%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
                    { label: 'Data Ingestion Rate', value: '4.2 TB/d', change: '+4.1%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> },
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

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Risk Trend Over Time</h3>
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
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div> Predicted
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }}></div> Actual
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '2px', paddingBottom: '2rem' }}>
                        {Array.from({ length: 40 }).map((_, i) => {
                            // Deterministic "random" height for purity
                            const height = 20 + ((i * 13) % 60);
                            return (
                                <div key={i} style={{ flex: 1, height: `${height}%`, background: 'var(--primary)', opacity: 0.1 + (i / 40), borderRadius: '2px 2px 0 0' }}></div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Oct 01</span><span>Oct 08</span><span>Oct 15</span><span>Oct 22</span><span>Oct 31</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={handleExportData}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export Data
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={handleRefresh}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>ML Feature Importance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {[
                            { label: 'Origin Reliability', value: 92 },
                            { label: 'Route Deviation', value: 84 },
                            { label: 'Temp Stability', value: 76 },
                            { label: 'Entity History', value: 68 },
                            { label: 'Network Latency', value: 45 },
                        ].map((feat, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
                                    <span style={{ fontWeight: 600 }}>{feat.label}</span>
                                    <span style={{ fontWeight: 700 }}>{feat.value}%</span>
                                </div>
                                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                                    <div style={{ height: '100%', width: `${feat.value}%`, background: 'var(--primary)', borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Geographical Risk Heatmap</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zoom: {Math.round(zoomLevel * 100)}%</span>
                </div>
                <div style={{
                    height: '400px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed var(--border-light)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.3s ease', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg"
                            alt="World Map"
                            style={{ width: '80%', opacity: 0.1, filter: 'grayscale(1)' }}
                        />
                        <div style={{ position: 'absolute', top: '40%', left: '30%', width: '120px', height: '120px', background: 'var(--danger)', opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
                        <div style={{ position: 'absolute', top: '50%', left: '45%', width: '80px', height: '80px', background: 'var(--warning)', opacity: 0.15, borderRadius: '50%', filter: 'blur(15px)' }}></div>
                        <div style={{ position: 'absolute', top: '30%', left: '65%', width: '60px', height: '60px', background: 'var(--secondary)', opacity: 0.2, borderRadius: '50%', filter: 'blur(10px)' }}></div>
                    </div>
                    <p style={{ position: 'absolute', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Spatial intelligence layer active. Monitoring 4,202 global nodes.</p>
                    <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ background: 'white' }} onClick={handleZoomIn}>Zoom In</button>
                        <button className="btn btn-outline" style={{ background: 'white' }} onClick={handleZoomOut}>Zoom Out</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
