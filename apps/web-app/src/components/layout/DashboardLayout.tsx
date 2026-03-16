"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { isAuthenticated } from '@/lib/api';

export default function DashboardLayout({
    children,
    title,
    description
}: {
    children: React.ReactNode;
    title?: string;
    description?: string;
}) {
    const router = useRouter();
    const [timeRange, setTimeRange] = useState('Past 24 Hours');
    const [showTimeDropdown, setShowTimeDropdown] = useState(false);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (!isAuthenticated()) {
            router.replace('/login');
        } else {
            const timer = setTimeout(() => {
                setAuthChecked(true);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [router]);

    if (!authChecked) {
        return (
            <div style={{
                height: '100vh', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-primary)',
            }}>
                <div style={{
                    width: '32px', height: '32px',
                    border: '3px solid var(--border-light)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const timeRangeOptions = ['Past 1 Hour', 'Past 6 Hours', 'Past 24 Hours', 'Past 7 Days', 'Past 30 Days'];

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main style={{ background: 'var(--bg-primary)', overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <header style={{
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-light)',
                    padding: '0.75rem 2.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <div className="input-group" style={{ width: '400px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Search shipments, assets, or audits..." />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                            <div onClick={() => router.push('/alerts')} style={{ position: 'relative', cursor: 'pointer' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                <div style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }}></div>
                            </div>
                            <div style={{ cursor: 'pointer' }} onClick={() => alert('Help center coming soon!')}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                        </div>

                        <div style={{ borderLeft: '1px solid var(--border-light)', height: '32px', margin: '0 0.5rem' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>Alex Rivera</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Enterprise Admin</p>
                            </div>
                            <div onClick={() => router.push('/profile')} style={{ position: 'relative', cursor: 'pointer' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: '#e2e8f0',
                                    backgroundImage: 'url("https://i.pravatar.cc/150?u=alex@origin.io")',
                                    backgroundSize: 'cover'
                                }}></div>
                                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', background: 'var(--secondary)', borderRadius: '50%', border: '2px solid white' }}></div>
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{ padding: '2rem 2.5rem', flex: 1 }}>
                    {title && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{title}</h1>
                                    {description && <p style={{ color: 'var(--text-muted)' }}>{description}</p>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    {/* Time Range Dropdown */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowFilterPanel(false); }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            {timeRange}
                                        </button>
                                        {showTimeDropdown && (
                                            <div style={{
                                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                                background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                                                borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 50,
                                                minWidth: '180px', overflow: 'hidden'
                                            }}>
                                                {timeRangeOptions.map((option) => (
                                                    <div
                                                        key={option}
                                                        onClick={() => { setTimeRange(option); setShowTimeDropdown(false); }}
                                                        style={{
                                                            padding: '0.625rem 1rem', fontSize: '0.8125rem', cursor: 'pointer',
                                                            fontWeight: timeRange === option ? 700 : 500,
                                                            color: timeRange === option ? 'var(--primary)' : 'var(--text-main)',
                                                            background: timeRange === option ? 'var(--primary-light)' : 'transparent',
                                                            transition: 'background var(--transition-fast)'
                                                        }}
                                                        onMouseEnter={(e) => { if (timeRange !== option) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                                        onMouseLeave={(e) => { if (timeRange !== option) e.currentTarget.style.background = 'transparent'; }}
                                                    >
                                                        {option}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Filters Button */}
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => { setShowFilterPanel(!showFilterPanel); setShowTimeDropdown(false); }}
                                        style={{ background: showFilterPanel ? 'var(--bg-hover)' : undefined }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                        Filters
                                    </button>

                                    {/* New Shipment Button */}
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => router.push('/shipments')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        New Shipment
                                    </button>
                                </div>
                            </div>

                            {/* Filter Panel */}
                            {showFilterPanel && (
                                <div style={{
                                    marginTop: '1rem', padding: '1.25rem', background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-light)', borderRadius: '10px',
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>FILTER BY:</span>
                                    {['All', 'Critical Risk', 'Active Only', 'Pending Audit', 'Disputed'].map((filter) => (
                                        <button
                                            key={filter}
                                            className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                            onClick={() => { alert(`Filter applied: ${filter}`); setShowFilterPanel(false); }}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}
