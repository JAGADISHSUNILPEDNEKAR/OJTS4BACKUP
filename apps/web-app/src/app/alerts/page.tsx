import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AlertsPage() {
    return (
        <DashboardLayout
            title="Alerts & ML Monitoring"
            description="Intelligent anomaly detection and system-wide alert management."
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', margin: 0 }}>ML Service Health</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">Model Status</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Active (Isolation Forest)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">Last Retrain</span>
                            <span style={{ color: 'var(--text-main)' }}>1 hour ago</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">Precision Score</span>
                            <span style={{ color: 'var(--text-main)' }}>0.982</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">Recall Score</span>
                            <span style={{ color: 'var(--text-main)' }}>0.945</span>
                        </div>
                    </div>
                </div>

                <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', margin: 0 }}>Alert Distribution</h2>
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '1rem', paddingBottom: '1rem' }}>
                        {[40, 70, 45, 90, 65, 30, 50].map((h, i) => (
                            <div key={i} style={{ flex: 1, background: 'linear-gradient(to top, var(--primary), var(--secondary))', height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.8 }}></div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }} className="text-muted">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>
            </div>

            <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', margin: 0 }}>Recent Alerts</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { id: 'ALT-105', type: 'Anomaly', severity: 'Critical', msg: 'Unexpected temperature variance in SHP-9019 (Guatemala)', time: '2 mins ago', color: 'var(--danger)' },
                        { id: 'ALT-104', type: 'Network', severity: 'Warning', msg: 'Latency spike in IoT node 448 (Santos, BR)', time: '15 mins ago', color: 'var(--warning)' },
                        { id: 'ALT-103', type: 'Fraud', severity: 'High', msg: 'Multiple rapid anchor verification attempts from single IP', time: '1 hour ago', color: 'var(--secondary)' },
                    ].map((alert, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: alert.color, boxShadow: `0 0 10px ${alert.color}` }}></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600 }}>{alert.id} - {alert.type}</span>
                                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{alert.time}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{alert.msg}</p>
                            </div>
                            <button style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-main)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>Dismiss</button>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
