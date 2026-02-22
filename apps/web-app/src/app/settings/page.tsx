import DashboardLayout from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
    return (
        <DashboardLayout
            title="Account Settings"
            description="Manage your account preferences, security settings, and notification thresholds."
        >
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Profile Information</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Display Name</label>
                            <input type="text" defaultValue="Alex Rivera" style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'white' }} />
                        </div>
                        <div className="input-group">
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Email Address</label>
                            <input type="email" defaultValue="alex@origin.io" style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'white' }} />
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Save Changes</button>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>System Preferences</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>ML High Risk Alerts</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Receive instant push notifications for critical anomalies.</p>
                            </div>
                            <div style={{ width: '36px', height: '20px', background: 'var(--primary)', borderRadius: '10px', position: 'relative' }}>
                                <div style={{ position: 'absolute', right: '2px', top: '2px', width: '16px', height: '16px', background: 'white', borderRadius: '50%' }}></div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Bitcoin Anchor Reports</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Weekly summary of on-chain verification status.</p>
                            </div>
                            <div style={{ width: '36px', height: '20px', background: 'var(--bg-primary)', borderRadius: '10px', position: 'relative', border: '1px solid var(--border-light)' }}>
                                <div style={{ position: 'absolute', left: '2px', top: '2px', width: '16px', height: '16px', background: 'white', border: '1px solid var(--border-light)', borderRadius: '50%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
