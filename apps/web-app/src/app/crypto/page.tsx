"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchEscrows, settleEscrow, disputeEscrow, releaseEscrow } from '@/lib/api';

export default function CryptoPage() {
    const router = useRouter();
    const [escrows, setEscrows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    useEffect(() => {
        const loadEscrows = async () => {
            setLoading(true);
            const data = await fetchEscrows();
            setEscrows(data);
            setLoading(false);
        };
        loadEscrows();
    }, []);

    const filteredEscrows = escrows.filter(e => {
        if (statusFilter === 'All') return true;
        return e.status === statusFilter;
    });

    const handleSettle = async (id: string) => {
        await settleEscrow(id);
        setEscrows(prev => prev.map(e => e.id === id ? { ...e, status: 'Settled' } : e));
        setActiveMenu(null);
        alert(`Escrow ${id} settled successfully`);
    };

    const handleDispute = async (id: string) => {
        await disputeEscrow(id);
        setEscrows(prev => prev.map(e => e.id === id ? { ...e, status: 'Disputed' } : e));
        setActiveMenu(null);
        alert(`Dispute raised for ${id}`);
    };

    const handleRelease = async (id: string) => {
        await releaseEscrow(id);
        setEscrows(prev => prev.map(e => e.id === id ? { ...e, status: 'Released' } : e));
        setActiveMenu(null);
        alert(`Escrow ${id} released`);
    };

    const statusOptions = ['All', 'Locked', 'Partially Released', 'Settled', 'Disputed'];

    return (
        <DashboardLayout
            title="Escrow & Financial Settlements"
            description="Secure Bitcoin-anchored escrow contracts and cross-border settlement oversight."
        >
            {/* Quick Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Escrow Volume (BTC)', value: '128.4', change: '+12.5%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, color: 'var(--primary)' },
                    { label: 'Settled Today', value: escrows.filter(e => e.status === 'Settled').length.toString(), change: '+2.1%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, color: 'var(--secondary)' },
                    { label: 'Active Contracts', value: escrows.filter(e => e.status === 'Locked' || e.status === 'Partially Released').length.toString(), change: '+5.4%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>, color: 'var(--info)' },
                ].map((stat, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-primary)', color: stat.color }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '0' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Escrow Agreement Table</h3>
                        <div style={{ position: 'relative' }}>
                            <button
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            >
                                Filter: {statusFilter}
                            </button>
                            {showFilterDropdown && (
                                <div style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                    background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                                    borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 50,
                                    minWidth: '160px', overflow: 'hidden'
                                }}>
                                    {statusOptions.map((opt) => (
                                        <div
                                            key={opt}
                                            onClick={() => { setStatusFilter(opt); setShowFilterDropdown(false); }}
                                            style={{
                                                padding: '0.625rem 1rem', fontSize: '0.8125rem', cursor: 'pointer',
                                                fontWeight: statusFilter === opt ? 700 : 500,
                                                color: statusFilter === opt ? 'var(--primary)' : 'var(--text-main)',
                                                background: statusFilter === opt ? 'var(--primary-light)' : 'transparent',
                                            }}
                                            onMouseEnter={(e) => { if (statusFilter !== opt) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                            onMouseLeave={(e) => { if (statusFilter !== opt) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Contract ID</th>
                                    <th>Counterparty</th>
                                    <th>Value (BTC)</th>
                                    <th>Status</th>
                                    <th>ML Risk</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEscrows.map((escrow, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{escrow.id}</td>
                                        <td style={{ fontWeight: 600 }}>{escrow.counterparty}</td>
                                        <td style={{ fontWeight: 700 }}>{escrow.value}</td>
                                        <td>
                                            <span className={`badge ${escrow.status === 'Settled' || escrow.status === 'Released' ? 'badge-success' : escrow.status === 'Disputed' ? 'badge-danger' : escrow.status === 'Locked' ? 'badge-primary' : 'badge-warning'}`}>
                                                {escrow.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '32px', height: '4px', background: '#f1f5f9', borderRadius: '2px' }}>
                                                    <div style={{ height: '100%', width: `${escrow.risk}%`, background: escrow.risk > 50 ? 'var(--danger)' : escrow.risk > 20 ? 'var(--warning)' : 'var(--secondary)', borderRadius: '2px' }}></div>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{escrow.risk}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ position: 'relative' }}>
                                                <button
                                                    onClick={() => setActiveMenu(activeMenu === escrow.id ? null : escrow.id)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                                </button>
                                                {activeMenu === escrow.id && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem',
                                                        background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
                                                        borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 50,
                                                        minWidth: '140px', overflow: 'hidden'
                                                    }}>
                                                        <div onClick={() => alert(`Viewing details for ${escrow.id}\n\nCounterparty: ${escrow.counterparty}\nValue: ${escrow.value}\nStatus: ${escrow.status}\nRisk Score: ${escrow.risk}`)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500 }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                            View Details
                                                        </div>
                                                        {escrow.status === 'Locked' && (
                                                            <div onClick={() => handleRelease(escrow.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500, color: 'var(--secondary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                                Release Funds
                                                            </div>
                                                        )}
                                                        {(escrow.status === 'Locked' || escrow.status === 'Partially Released') && (
                                                            <>
                                                                <div onClick={() => handleSettle(escrow.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500, color: 'var(--primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                                    Settle Contract
                                                                </div>
                                                                <div onClick={() => handleDispute(escrow.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500, color: 'var(--danger)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                                    Raise Dispute
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredEscrows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            {loading ? 'Loading escrow contracts...' : 'No contracts matching the filter.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card" style={{ background: 'var(--danger-light)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ color: 'var(--danger)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--danger)' }}>Origin ML Risk Insight</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '0.25rem', marginBottom: '1rem' }}>Contract ESC-8839 (EuroProduce) is currently under dispute due to unscheduled route deviation detected by ML Model v2.4.</p>
                            <button
                                className="btn btn-primary"
                                style={{ background: 'var(--danger)', width: '100%', justifyContent: 'center' }}
                                onClick={() => router.push('/alerts')}
                            >
                                Investigate Incident
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
