"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/api';

const REGISTER_ROLE_OPTIONS = [
    { value: 'COMPANY', label: 'Enterprise Operator' },
    { value: 'FARMER', label: 'Farmer' },
    { value: 'LOGISTICS', label: 'Logistics Coordinator' },
    { value: 'AUDITOR', label: 'Auditor' },
    { value: 'RETAILER', label: 'Retailer' },
    { value: 'GOVERNMENT', label: 'Government Oversight' },
    { value: 'CONSUMER', label: 'Consumer' },
];

const DEMO_ACCOUNTS = [
    { role: 'SUPERADMIN', email: 'admin@origin.demo', label: 'Platform Admin' },
    { role: 'COMPANY', email: 'company@origin.demo', label: 'Enterprise Operator' },
    { role: 'FARMER', email: 'farmer@origin.demo', label: 'Farmer' },
    { role: 'LOGISTICS', email: 'logistics@origin.demo', label: 'Logistics' },
    { role: 'AUDITOR', email: 'auditor@origin.demo', label: 'Auditor' },
    { role: 'RETAILER', email: 'retailer@origin.demo', label: 'Retailer' },
    { role: 'GOVERNMENT', email: 'government@origin.demo', label: 'Government' },
    { role: 'CONSUMER', email: 'consumer@origin.demo', label: 'Consumer' },
];

export default function LoginPage() {
    const router = useRouter();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [registerRole, setRegisterRole] = useState('COMPANY');
    const [totpCode, setTotpCode] = useState('');
    const [showTotp, setShowTotp] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDemo, setShowDemo] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register(email, password, registerRole);
            } else {
                await login(email, password, totpCode || undefined);
            }
            router.push('/');
        } catch (err: unknown) {
            const error = err as Error;
            const message = error.message || 'Authentication failed';
            if (message === 'TOTP code required') {
                setShowTotp(true);
                setError('Enter your 2FA code to continue.');
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDemoFill = (demoEmail: string) => {
        setEmail(demoEmail);
        setPassword('demo');
        setIsRegister(false);
        setShowTotp(false);
        setError('');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated background orbs */}
            <div style={{
                position: 'absolute', top: '-20%', left: '-10%',
                width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
                animation: 'float 8s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute', bottom: '-15%', right: '-5%',
                width: '500px', height: '500px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
                animation: 'float 10s ease-in-out infinite reverse',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: '440px', padding: '0 1.5rem',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #3b82f6, #10b981)',
                        marginBottom: '1.25rem',
                        boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <h1 style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '1.75rem', fontWeight: 800,
                        color: '#ffffff', letterSpacing: '-0.03em',
                        margin: '0 0 0.375rem',
                    }}>
                        Origin
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                        Supply Chain Intelligence Platform
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '20px',
                    padding: '2.5rem',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
                }}>
                    <h2 style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '1.25rem', fontWeight: 700,
                        color: '#f1f5f9', margin: '0 0 0.25rem',
                    }}>
                        {isRegister ? 'Create your account' : 'Welcome back'}
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0 0 2rem' }}>
                        {isRegister ? 'Start protecting your supply chain.' : 'Sign in to continue to your dashboard.'}
                    </p>

                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem', borderRadius: '10px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: '#fca5a5', fontSize: '0.8125rem', fontWeight: 500,
                            marginBottom: '1.25rem',
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Email
                            </label>
                            <input
                                id="email-input"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@company.com"
                                required
                                style={{
                                    width: '100%', padding: '0.75rem 1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', color: '#f1f5f9',
                                    fontSize: '0.875rem', outline: 'none',
                                    transition: 'border-color 0.15s ease-out',
                                }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Password
                            </label>
                            <input
                                id="password-input"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%', padding: '0.75rem 1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px', color: '#f1f5f9',
                                    fontSize: '0.875rem', outline: 'none',
                                    transition: 'border-color 0.15s ease-out',
                                }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {isRegister && (
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Role
                                </label>
                                <select
                                    id="role-select"
                                    value={registerRole}
                                    onChange={e => setRegisterRole(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px', color: '#f1f5f9',
                                        fontSize: '0.875rem', outline: 'none',
                                        appearance: 'none',
                                        transition: 'border-color 0.15s ease-out',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                >
                                    {REGISTER_ROLE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value} style={{ background: '#1e293b', color: '#f1f5f9' }}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {showTotp && (
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    2FA Code
                                </label>
                                <input
                                    id="totp-input"
                                    type="text"
                                    value={totpCode}
                                    onChange={e => setTotpCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    maxLength={6}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px', color: '#f1f5f9',
                                        fontSize: '0.875rem', outline: 'none',
                                        letterSpacing: '0.25em', textAlign: 'center',
                                        transition: 'border-color 0.15s ease-out',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        )}

                        <button
                            id="submit-btn"
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '0.875rem',
                                background: loading ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                color: 'white', border: 'none',
                                borderRadius: '10px', fontSize: '0.875rem',
                                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease-out',
                                boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                                marginTop: '0.5rem',
                            }}
                        >
                            {loading ? 'Authenticating...' : (isRegister ? 'Create Account' : 'Sign In')}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button
                            onClick={() => { setIsRegister(!isRegister); setError(''); setShowTotp(false); }}
                            style={{
                                background: 'none', border: 'none',
                                color: '#3b82f6', fontSize: '0.8125rem',
                                fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            {isRegister ? '← Back to Sign In' : "Don't have an account? Register"}
                        </button>
                    </div>

                    {/* Demo accounts disclosure */}
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={() => setShowDemo(s => !s)}
                            style={{
                                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'none', border: 'none',
                                color: '#94a3b8', fontSize: '0.75rem',
                                fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}
                        >
                            <span>Try a demo account</span>
                            <span style={{ fontSize: '0.875rem' }}>{showDemo ? '−' : '+'}</span>
                        </button>
                        {showDemo && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
                                {DEMO_ACCOUNTS.map(acc => (
                                    <button
                                        key={acc.role}
                                        type="button"
                                        onClick={() => handleDemoFill(acc.email)}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.125rem',
                                            padding: '0.5rem 0.625rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            color: '#cbd5e1', fontSize: '0.6875rem',
                                            cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.15s ease-out',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                    >
                                        <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{acc.label}</span>
                                        <span style={{ color: '#64748b', fontSize: '0.625rem' }}>{acc.email}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {showDemo && (
                            <p style={{ fontSize: '0.625rem', color: '#475569', textAlign: 'center', margin: '0.75rem 0 0' }}>
                                Click any account, then press Sign In. Password: <code style={{ color: '#94a3b8' }}>demo</code>
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.6875rem', marginTop: '2rem' }}>
                    Protected by end-to-end encryption & Merkle proof verification
                </p>
            </div>

            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-30px); }
                }
                input::placeholder {
                    color: #475569;
                }
            `}</style>
        </div>
    );
}
