"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';
import { getCurrentUser } from '@/lib/api';
import { getRoleConfig } from '@/lib/permissions';

const ORG_BY_ROLE: Record<string, string> = {
    SUPERADMIN: 'Origin Platform',
    COMPANY: 'GlobalLogistics',
    FARMER: 'Cooperative #441',
    LOGISTICS: 'Origin Fleet Network',
    AUDITOR: 'Origin Verification Bureau',
    RETAILER: 'Whole Harvest Market',
    GOVERNMENT: 'Trade & Customs Authority',
    CONSUMER: 'Origin Public',
    USER: 'Origin Network',
};

const AUTH_LEVEL_BY_ROLE: Record<string, string> = {
    SUPERADMIN: 'L4 Access',
    COMPANY: 'L3 Access',
    GOVERNMENT: 'L3 Access',
    AUDITOR: 'L3 Access',
    LOGISTICS: 'L2 Access',
    FARMER: 'L2 Access',
    RETAILER: 'L2 Access',
    CONSUMER: 'L1 Public',
    USER: 'L1 Public',
};

export default function ProfilePage() {
    const user = getCurrentUser();
    const roleConfig = getRoleConfig(user);
    const displayName = user?.display_name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || '';
    const roleKey = (user?.role || 'USER').toUpperCase();
    const org = ORG_BY_ROLE[roleKey] || ORG_BY_ROLE.USER;
    const authLevel = AUTH_LEVEL_BY_ROLE[roleKey] || AUTH_LEVEL_BY_ROLE.USER;
    const avatarSeed = email || 'origin-user';

    return (
        <DashboardLayout
            title="My Profile"
            description="Operational identity and activity history within the Origin ecosystem."
        >
            <div className="card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: 'clamp(1.5rem, 4vw, 3rem)' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 2rem' }}>
                    <div style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: '#e2e8f0',
                        backgroundImage: `url("https://i.pravatar.cc/150?u=${encodeURIComponent(avatarSeed)}")`,
                        backgroundSize: 'cover',
                        border: '4px solid white',
                        boxShadow: 'var(--shadow-lg)'
                    }}></div>
                    <div style={{ position: 'absolute', bottom: '5px', right: '5px', width: '28px', height: '28px', background: 'var(--secondary)', borderRadius: '50%', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>{displayName}</h2>
                <p style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {roleConfig.label} @ {org}
                </p>
                {email && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '2rem' }}>{email}</p>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '1.5rem 0', marginBottom: '2rem' }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>AUTHORIZATIONS</p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0.25rem 0' }}>{authLevel}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>ROLE</p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0.25rem 0' }}>{roleConfig.badge}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0 }}>REP SCORE</p>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0.25rem 0' }}>994 / 1k</p>
                    </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Identity Proofs</h3>
                    <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-light)', fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        DID: origin:eth:0x71C7656EC7ab88b098defB751B7401B5f6d8976F
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
