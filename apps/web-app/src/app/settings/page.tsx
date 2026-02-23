"use client";

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { updateProfile } from '@/lib/api';

export default function SettingsPage() {
    const [displayName, setDisplayName] = useState('Alex Rivera');
    const [email, setEmail] = useState('alex@origin.io');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [mlAlerts, setMlAlerts] = useState(true);
    const [bitcoinReports, setBitcoinReports] = useState(false);
    const [autoAudit, setAutoAudit] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    const hasChanges = displayName !== 'Alex Rivera' || email !== 'alex@origin.io';

    const handleSave = async () => {
        setSaving(true);
        await updateProfile({ displayName, email });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
        <div
            onClick={onToggle}
            style={{
                width: '36px', height: '20px',
                background: enabled ? 'var(--primary)' : 'var(--bg-primary)',
                borderRadius: '10px', position: 'relative', cursor: 'pointer',
                border: enabled ? 'none' : '1px solid var(--border-light)',
                transition: 'all var(--transition-fast)'
            }}
        >
            <div style={{
                position: 'absolute',
                [enabled ? 'right' : 'left']: '2px',
                top: '2px', width: '16px', height: '16px',
                background: 'white', borderRadius: '50%',
                border: enabled ? 'none' : '1px solid var(--border-light)',
                transition: 'all var(--transition-fast)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}></div>
        </div>
    );

    return (
        <DashboardLayout
            title="Account Settings"
            description="Manage your account preferences, security settings, and notification thresholds."
        >
            {/* Save confirmation banner */}
            {saved && (
                <div style={{
                    padding: '0.75rem 1.25rem', marginBottom: '1.5rem',
                    background: 'var(--secondary-light)', border: '1px solid var(--secondary)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--secondary)' }}>Settings saved successfully</span>
                </div>
            )}

            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Profile Information</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'white', fontSize: '0.875rem' }}
                            />
                        </div>
                        <div className="input-group" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'white', fontSize: '0.875rem' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1.5rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                            style={{ opacity: saving ? 0.6 : 1 }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {hasChanges && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                                ● Unsaved changes
                            </span>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>System Preferences</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>ML High Risk Alerts</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Receive instant push notifications for critical anomalies.</p>
                            </div>
                            <ToggleSwitch enabled={mlAlerts} onToggle={() => setMlAlerts(!mlAlerts)} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Bitcoin Anchor Reports</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Weekly summary of on-chain verification status.</p>
                            </div>
                            <ToggleSwitch enabled={bitcoinReports} onToggle={() => setBitcoinReports(!bitcoinReports)} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Auto-Audit on Delivery</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Automatically trigger compliance audit when shipment is delivered.</p>
                            </div>
                            <ToggleSwitch enabled={autoAudit} onToggle={() => setAutoAudit(!autoAudit)} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Dark Mode</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Switch to dark theme for reduced eye strain.</p>
                            </div>
                            <ToggleSwitch enabled={darkMode} onToggle={() => setDarkMode(!darkMode)} />
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
