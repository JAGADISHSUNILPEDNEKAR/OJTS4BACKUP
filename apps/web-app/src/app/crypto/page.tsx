"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchEscrows, fetchStats, settleEscrow, disputeEscrow, releaseEscrow, Escrow, PaginatedResponse, DatasetStats } from '@/lib/api';

export default function CryptoPage() {
    const router = useRouter();
    const [result, setResult] = useState<PaginatedResponse<Escrow>>({ data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 });
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('All');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const FILTER_MAP: Record<string, string> = {
        'All': '',
        'Held': 'HELD',
        'Released': 'RELEASED',
    };

    const loadEscrows = useCallback(async (p: number, filter: string) => {
        setLoading(true);
        const data = await fetchEscrows(p, FILTER_MAP[filter] || '');
        setResult(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadEscrows(page, statusFilter);
        fetchStats().then(setStats).catch(console.error);
    }, [page, statusFilter, loadEscrows]);

    const handleFilterChange = (filter: string) => {
        setStatusFilter(filter);
        setPage(1);
    };

    const handleSettle = async (id: string) => {
        await settleEscrow(id);
        setResult(prev => ({ ...prev, data: prev.data.map(e => e.id === id ? { ...e, status: 'Settled' } : e) }));
        setActiveMenu(null);
        alert(`Escrow ${id} settled successfully`);
    };

    const handleDispute = async (id: string) => {
        await disputeEscrow(id);
        setResult(prev => ({ ...prev, data: prev.data.map(e => e.id === id ? { ...e, status: 'Disputed' } : e) }));
        setActiveMenu(null);
        alert(`Dispute raised for ${id}`);
    };

    const handleRelease = async (id: string) => {
        await releaseEscrow(id);
        setResult(prev => ({ ...prev, data: prev.data.map(e => e.id === id ? { ...e, status: 'Released' } : e) }));
        setActiveMenu(null);
        alert(`Escrow ${id} released`);
    };

    const pageNumbers = (() => {
        const pages: number[] = [];
        const total = result.totalPages;
        const current = result.page;
        const start = Math.max(1, current - 2);
        const end = Math.min(total, current + 2);
        if (start > 1) pages.push(1);
        if (start > 2) pages.push(-1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < total - 1) pages.push(-2);
        if (end < total) pages.push(total);
        return pages;
    })();

    return (
        <DashboardLayout
            title="Escrow & Financial Settlements"
            description="Secure Bitcoin-anchored escrow contracts and cross-border settlement oversight."
        >
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Escrow (BTC)', value: stats ? stats.totalEscrowBTC.toFixed(1) : '—', change: '+12.5%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, color: 'var(--primary)' },
                    { label: 'Total Contracts', value: stats ? stats.totalShipments.toLocaleString() : '—', change: '+2.1%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, color: 'var(--secondary)' },
                    { label: 'Total Value (USD)', value: stats ? `$${(stats.totalEscrowUSD / 1000000).toFixed(1)}M` : '—', change: '+5.4%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>, color: 'var(--info)' },
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
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {Object.keys(FILTER_MAP).map(f => (
                                <button key={f} className={`btn ${statusFilter === f ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => handleFilterChange(f)}>{f}</button>
                            ))}
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
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading escrow contracts...</td></tr>
                                ) : result.data.map((escrow, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{escrow.id}</td>
                                        <td style={{ fontWeight: 600 }}>{escrow.counterparty}</td>
                                        <td style={{ fontWeight: 700 }}>{escrow.amount}</td>
                                        <td>
                                            <span className={`badge ${escrow.status === 'Settled' || escrow.status === 'RELEASED' || escrow.status === 'Released' ? 'badge-success' : escrow.status === 'Disputed' ? 'badge-danger' : 'badge-primary'}`}>
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
                                                <button onClick={() => setActiveMenu(activeMenu === escrow.id ? null : escrow.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                                </button>
                                                {activeMenu === escrow.id && (
                                                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)', zIndex: 50, minWidth: '140px', overflow: 'hidden' }}>
                                                        <div onClick={() => alert(`Contract: ${escrow.id}\nCounterparty: ${escrow.counterparty}\nValue: ${escrow.amount}\nStatus: ${escrow.status}\nRisk: ${escrow.risk}`)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500 }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>View Details</div>
                                                        {escrow.status === 'HELD' && (
                                                            <div onClick={() => handleRelease(escrow.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500, color: 'var(--secondary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>Release Funds</div>
                                                        )}
                                                        {escrow.status === 'HELD' && (
                                                            <>
                                                                <div onClick={() => handleSettle(escrow.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500, color: 'var(--primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>Settle Contract</div>
                                                                <div onClick={() => handleDispute(escrow.id)} style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', cursor: 'pointer', fontWeight: 500, color: 'var(--danger)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>Raise Dispute</div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!loading && result.data.length === 0 && (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No contracts matching the filter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Page {result.page} of {result.totalPages.toLocaleString()} ({result.total.toLocaleString()} contracts)</p>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={result.page <= 1}>← Prev</button>
                            {pageNumbers.map((p, i) => p < 0 ? <span key={i} style={{ padding: '0 0.25rem', color: 'var(--text-muted)' }}>…</span> : <button key={i} className={`btn ${p === result.page ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', minWidth: '2rem' }} onClick={() => setPage(p)}>{p}</button>)}
                            <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setPage(p => Math.min(result.totalPages, p + 1))} disabled={result.page >= result.totalPages}>Next →</button>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ background: 'var(--danger-light)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div style={{ color: 'var(--danger)' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: 'var(--danger)' }}>Origin ML Risk Insight</h4>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '0.25rem', marginBottom: '1rem' }}>
                                {stats ? `${stats.fraudCount.toLocaleString()} fraud cases detected across ${stats.totalShipments.toLocaleString()} contracts. ${stats.originMismatches.toLocaleString()} origin mismatches flagged by ML Model v2.4.` : 'Loading...'}
                            </p>
                            <button className="btn btn-primary" style={{ background: 'var(--danger)', width: '100%', justifyContent: 'center' }} onClick={() => router.push('/alerts')}>Investigate Incidents</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
