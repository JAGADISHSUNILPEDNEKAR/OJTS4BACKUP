"use client";

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchAudits, fetchStats, requestAudit, Audit, PaginatedResponse, DatasetStats } from '@/lib/api';

export default function AuditsPage() {
    const [result, setResult] = useState<PaginatedResponse<Audit>>({ data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 });
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('All');

    const FILTER_MAP: Record<string, string> = {
        'All': '',
        'Passed': 'Passed',
        'Warning': 'Warning',
        'Failed': 'Failed',
    };

    const loadAudits = useCallback(async (p: number, filter: string) => {
        setLoading(true);
        const data = await fetchAudits(p, FILTER_MAP[filter] || '');
        setResult(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadAudits(page, statusFilter);
        fetchStats().then(setStats).catch(console.error);
    }, [page, statusFilter, loadAudits]);

    const handleFilterChange = (filter: string) => {
        setStatusFilter(filter);
        setPage(1);
    };

    const handleRequestAudit = async () => {
        setRequesting(true);
        await requestAudit('manual-request');
        setRequesting(false);
        alert('Audit request submitted successfully');
    };

    const handleViewDetails = (audit: Audit) => {
        alert(
            `Audit Details\n\n` +
            `ID: ${audit.id}\n` +
            `Entity: ${audit.entity}\n` +
            `Type: ${audit.type}\n` +
            `Auditor: ${audit.auditor}\n` +
            `Status: ${audit.status}\n` +
            `Findings: ${audit.findings}\n` +
            `Timestamp: ${new Date(audit.timestamp).toLocaleString()}`
        );
    };

    const handleExportLog = () => {
        const csvContent = [
            'ID,Entity,Type,Auditor,Status,Findings,Timestamp',
            ...result.data.map(a => `${a.id},${a.entity},${a.type},${a.auditor},${a.status},${a.findings},${a.timestamp}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit_log_page_${page}.csv`;
        link.click();
        URL.revokeObjectURL(url);
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
            title="System Audits & Compliance"
            description="Immutable audit logs and compliance reporting for regulatory oversight."
        >
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Total Audits', value: stats ? stats.totalShipments.toLocaleString() : '—', color: 'var(--primary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
                    { label: 'Passed', value: stats ? stats.passedAudits.toLocaleString() : '—', color: 'var(--secondary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
                    { label: 'Failed', value: stats ? stats.failedAudits.toLocaleString() : '—', color: 'var(--danger)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> },
                    { label: 'Compliance Rate', value: stats && stats.totalShipments > 0 ? `${Math.round((stats.passedAudits / stats.totalShipments) * 100)}%` : '—', color: 'var(--info)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
                ].map((stat, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'var(--bg-primary)', color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontWeight: 600, margin: 0 }}>{stat.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(FILTER_MAP).map(filter => (
                        <button
                            key={filter}
                            className={`btn ${statusFilter === filter ? 'btn-primary' : 'btn-outline'}`}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => handleFilterChange(filter)}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={handleExportLog}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={handleRequestAudit} disabled={requesting} style={{ opacity: requesting ? 0.6 : 1 }}>
                        {requesting ? 'Requesting...' : 'Request Audit'}
                    </button>
                </div>
            </div>

            {/* Audit Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th className="hide-on-mobile">Audit ID</th>
                                <th>Entity</th>
                                <th>Type</th>
                                <th className="hide-on-mobile">Auditor</th>
                                <th>Status</th>
                                <th>Findings</th>
                                <th className="hide-on-mobile">Timestamp</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading audits...</td></tr>
                            ) : result.data.map((audit, i) => (
                                <tr key={i}>
                                    <td className="hide-on-mobile" style={{ fontWeight: 800, color: 'var(--primary)' }}>{audit.id}</td>
                                    <td style={{ fontWeight: 600 }}>{audit.entity}</td>
                                    <td>{audit.type}</td>
                                    <td className="hide-on-mobile">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0' }}></div>
                                            <span style={{ fontSize: '0.8125rem' }}>{audit.auditor}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${audit.status === 'Passed' ? 'badge-success' : audit.status === 'Failed' ? 'badge-danger' : audit.status === 'Warning' ? 'badge-warning' : 'badge-info'}`}>
                                            {audit.status}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: audit.findings > 0 ? 'var(--danger)' : 'var(--secondary)' }}>
                                        {audit.findings}
                                    </td>
                                    <td className="hide-on-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        {new Date(audit.timestamp).toLocaleString()}
                                    </td>
                                    <td>
                                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => handleViewDetails(audit)}>
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && result.data.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No audits matching the current filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Page {result.page} of {result.totalPages.toLocaleString()} ({result.total.toLocaleString()} audits)</p>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={result.page <= 1}>← Prev</button>
                        {pageNumbers.map((p, i) => p < 0 ? <span key={i} style={{ padding: '0 0.25rem', color: 'var(--text-muted)' }}>…</span> : <button key={i} className={`btn ${p === result.page ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', minWidth: '2rem' }} onClick={() => setPage(p)}>{p}</button>)}
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setPage(p => Math.min(result.totalPages, p + 1))} disabled={result.page >= result.totalPages}>Next →</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
