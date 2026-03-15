"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/api';

export default function LogoutPage() {
    const router = useRouter();

    useEffect(() => {
        const doLogout = async () => {
            await logout();
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        };
        doLogout();
    }, [router]);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    margin: '0 auto 1.5rem',
                    animation: 'spin 1s linear infinite'
                }}></div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.5rem' }}>Signing you out...</h2>
                <p style={{ color: '#64748b', margin: 0 }}>Securely ending your session.</p>
            </div>
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
