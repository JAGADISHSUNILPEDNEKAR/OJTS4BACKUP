"use client";

import Link from 'next/link';
import { useUser } from '@/lib/auth-store';
import { can, getRoleConfig } from '@/lib/permissions';
import type { Capability } from '@/lib/roles.config';

interface RequireCapabilityProps {
    cap: Capability;
    children: React.ReactNode;
    /** Optional override for the human-readable feature name in the denied message. */
    featureLabel?: string;
}

/**
 * Renders children only when the current user has the given capability.
 *
 * On denial, renders an in-page access-denied panel rather than redirecting,
 * so the sidebar/header stay intact and the user can navigate elsewhere.
 * Place inside DashboardLayout, not around it.
 */
export default function RequireCapability({ cap, children, featureLabel }: RequireCapabilityProps) {
    const user = useUser();
    if (can(user, cap)) {
        return <>{children}</>;
    }

    const roleLabel = getRoleConfig(user).label;
    const feature = featureLabel || cap.split('.')[0];

    return (
        <div className="card" style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '2rem auto',
        }}>
            <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem',
                color: 'var(--primary)',
            }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-main)' }}>
                Not available for your role
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                The <strong>{feature}</strong> section isn&apos;t part of the {roleLabel} workspace.
                If you believe you should have access, contact your platform administrator.
            </p>
            <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.75rem 1.5rem' }}>
                Back to Dashboard
            </Link>
        </div>
    );
}
