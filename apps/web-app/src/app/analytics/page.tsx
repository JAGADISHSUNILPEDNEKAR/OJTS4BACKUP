"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AnalyticsPage() {
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div> Predicted
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }}></div> Actual
                            </span>
                        </div>
                    </div>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: '2px', paddingBottom: '2rem' }}>
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} style={{ flex: 1, height: `${20 + Math.random() * 60}%`, background: 'var(--primary)', opacity: 0.1 + (i / 40), borderRadius: '2px 2px 0 0' }}></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>Oct 01</span><span>Oct 08</span><span>Oct 15</span><span>Oct 22</span><span>Oct 31</span>
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
                                    <div style={{ height: '100%', width: `${feat.value}%`, background: 'var(--primary)', borderRadius: '3px' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Geographical Risk Heatmap</h3>
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
                    <img
                        src="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg"
                        alt="World Map"
                        style={{ width: '80%', opacity: 0.1, filter: 'grayscale(1)' }}
                    />
                    <div style={{ position: 'absolute', top: '40%', left: '30%', width: '120px', height: '120px', background: 'var(--danger)', opacity: 0.1, borderRadius: '50%', filter: 'blur(20px)' }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: '45%', width: '80px', height: '80px', background: 'var(--warning)', opacity: 0.15, borderRadius: '50%', filter: 'blur(15px)' }}></div>
                    <div style={{ position: 'absolute', top: '30%', left: '65%', width: '60px', height: '60px', background: 'var(--secondary)', opacity: 0.2, borderRadius: '50%', filter: 'blur(10px)' }}></div>
                    <p style={{ position: 'absolute', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Spatial intelligence layer active. Monitoring 4,202 global nodes.</p>
                    <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ background: 'white' }}>Zoom In</button>
                        <button className="btn btn-outline" style={{ background: 'white' }}>Zoom Out</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
