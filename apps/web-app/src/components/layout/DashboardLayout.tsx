"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import {
    isAuthenticated,
    getCurrentUser,
    searchEntities,
    SearchResults,
    Shipment,
    Alert,
    Audit
} from '@/lib/api';
import { getRoleConfig } from '@/lib/permissions';
import { useRef } from 'react';

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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

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

    // Close sidebar on route change / resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);
    
    // Global search effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await searchEntities(searchQuery);
                    setSearchResults(results);
                    setShowSearchResults(true);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults(null);
                setShowSearchResults(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close search on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            {/* Mobile sidebar overlay */}
            <div
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main style={{ background: 'var(--bg-primary)', overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <header style={{
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-light)',
                    padding: '0.75rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    gap: '0.75rem'
                }}>
                    {/* Hamburger menu button (visible on mobile via CSS) */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>

                    <div 
                        ref={searchRef}
                        className="input-group hide-mobile" 
                        style={{ width: '400px', maxWidth: '100%', position: 'relative' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                            type="text" 
                            placeholder="Search shipments, assets, or audits..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => { if (searchQuery.length >= 2) setShowSearchResults(true); }}
                        />
                        {isSearching && (
                            <div style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                width: '14px', height: '14px', border: '2px solid var(--border-light)',
                                borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.6s linear infinite'
                            }} />
                        )}

                        {/* Search Results Dropdown */}
                        {showSearchResults && (searchResults) && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                                background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
                                border: '1px solid var(--border-light)', borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                zIndex: 100, maxHeight: '420px', overflowY: 'auto', padding: '0.5rem'
                            }}>
                                {searchResults.shipments.length === 0 && searchResults.alerts.length === 0 && searchResults.audits.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                        No results found for &quot;{searchQuery}&quot;
                                    </div>
                                ) : (
                                    <>
                                        {searchResults.shipments.length > 0 && (
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                                    SHIPMENTS
                                                </div>
                                                {searchResults.shipments.map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => { router.push(`/shipments?id=${s.id}`); setShowSearchResults(false); }}
                                                        style={{ padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                                                        className="search-result-item"
                                                    >
                                                        <div style={{ width: '32px', height: '32px', background: 'var(--primary-light)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                                            {s.id.charAt(0)}
                                                        </div>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.id}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.origin} → {s.destination}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {searchResults.alerts.length > 0 && (
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                                    ALERTS
                                                </div>
                                                {searchResults.alerts.map(a => (
                                                    <div 
                                                        key={a.id} 
                                                        onClick={() => { router.push(`/alerts?id=${a.id}`); setShowSearchResults(false); }}
                                                        style={{ padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                                                        className="search-result-item"
                                                    >
                                                        <div style={{ width: '32px', height: '32px', background: a.severity === 'CRITICAL' ? 'var(--danger-light)' : 'var(--warning-light)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }}>
                                                            !
                                                        </div>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.type}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.id} • {a.message}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {searchResults.audits.length > 0 && (
                                            <div>
                                                <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                    AUDITS
                                                </div>
                                                {searchResults.audits.map(au => (
                                                    <div 
                                                        key={au.id} 
                                                        onClick={() => { router.push(`/audits?id=${au.id}`); setShowSearchResults(false); }}
                                                        style={{ padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s ease' }}
                                                        className="search-result-item"
                                                    >
                                                        <div style={{ width: '32px', height: '32px', background: 'var(--secondary-light)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', flexShrink: 0 }}>
                                                            A
                                                        </div>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{au.type}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{au.id} • {au.auditor}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                                <style jsx>{`
                                    .search-result-item:hover {
                                        background: var(--bg-hover) !important;
                                    }
                                    @keyframes spin { 
                                        to { transform: translateY(-50%) rotate(360deg); } 
                                    }
                                `}</style>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-muted)' }}>
                            <div onClick={() => router.push('/alerts')} style={{ position: 'relative', cursor: 'pointer' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                <div style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }}></div>
                            </div>
                            <div className="hide-mobile" style={{ cursor: 'pointer' }} onClick={() => alert('Help center coming soon!')}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                        </div>

                        <div className="hide-mobile" style={{ borderLeft: '1px solid var(--border-light)', height: '32px', margin: '0 0.25rem' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="hide-mobile" style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                                    {getCurrentUser()?.display_name || getCurrentUser()?.email || 'User'}
                                </p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                    {getRoleConfig(getCurrentUser()).label}
                                </p>
                            </div>
                            <div onClick={() => router.push('/profile')} style={{ position: 'relative', cursor: 'pointer' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: '#e2e8f0',
                                    backgroundImage: `url("https://i.pravatar.cc/150?u=${getCurrentUser()?.email || 'user@origin.io'}")`,
                                    backgroundSize: 'cover'
                                }}></div>
                                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', background: 'var(--secondary)', borderRadius: '50%', border: '2px solid white' }}></div>
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{ padding: 'clamp(0.75rem, 2vw, 2.5rem)', flex: 1 }}>
                    {title && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ minWidth: 0 }}>
                                    <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.875rem)', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{title}</h1>
                                    {description && <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{description}</p>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {/* Time Range Dropdown */}
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowFilterPanel(false); }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            <span className="hide-mobile">{timeRange}</span>
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
                                        <span className="hide-mobile">Filters</span>
                                    </button>

                                    {/* New Shipment Button */}
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => router.push('/shipments')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        <span className="hide-mobile">New Shipment</span>
                                    </button>
                                </div>
                            </div>

                            {/* Filter Panel */}
                            {showFilterPanel && (
                                <div style={{
                                    marginTop: '1rem', padding: '1.25rem', background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-light)', borderRadius: '10px',
                                    boxShadow: 'var(--shadow-sm)',
                                    display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap'
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
