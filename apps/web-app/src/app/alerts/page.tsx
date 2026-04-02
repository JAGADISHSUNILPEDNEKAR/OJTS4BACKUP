"use client";

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchAlerts, fetchStats, acknowledgeAlert, ignoreAlert, bulkAcknowledgeAlerts, Alert, PaginatedResponse, DatasetStats } from '@/lib/api';

export default function AlertsPage() {
    const [result, setResult] = useState<PaginatedResponse<Alert>>({ data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 });
    const [stats, setStats] = useState<DatasetStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [severityFilter, setSeverityFilter] = useState('All');
    const [processing, setProcessing] = useState<string | null>(null);

    const FILTER_MAP: Record<string, string> = {
        'All': '',
        'Critical': 'CRITICAL',
        'Warning': 'WARNING',
    };

    const loadAlerts = useCallback(async (p: number, filter: string) => {
        setLoading(true);
        const data = await fetchAlerts(p, FILTER_MAP[filter] || '');
        setResult(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadAlerts(page, severityFilter);
        fetchStats().then(setStats).catch(console.error);
    }, [page, severityFilter, loadAlerts]);

    const handleFilterChange = (filter: string) => {
        setSeverityFilter(filter);
        setPage(1);
    };

    const handleAcknowledge = async (alertId: string) => {
        setProcessing(alertId);
        await acknowledgeAlert(alertId);
        setResult(prev => ({
            ...prev,
            data: prev.data.map(a => a.id === alertId ? { ...a, status: 'Acknowledged' } : a)
        }));
        setProcessing(null);
    };

    const handleIgnore = async (alertId: string) => {
        setProcessing(alertId);
        await ignoreAlert(alertId);
        setResult(prev => ({
            ...prev,
            data: prev.data.filter(a => a.id !== alertId)
        }));
        setProcessing(null);
    };

    const handleBulkAcknowledge = async () => {
        const openIds = result.data.filter(a => a.status === 'OPEN').map(a => a.id);
        if (openIds.length === 0) { alert('No open alerts on this page'); return; }
        setProcessing('bulk');
        await bulkAcknowledgeAlerts(openIds);
        setResult(prev => ({
            ...prev,
            data: prev.data.map(a => a.status === 'OPEN' ? { ...a, status: 'Acknowledged' } : a)
        }));
        setProcessing(null);
        alert(`${openIds.length} alerts acknowledged`);
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
            title="Incident Response Center"
            description="Centralized command for anomaly resolution and manual intervention."
        >
            {/* Quick Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Critical Alerts', value: stats ? stats.criticalAlerts.toLocaleString() : '—', color: 'var(--danger)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> },
                    { label: 'Warning Alerts', value: stats ? stats.warningAlerts.toLocaleString() : '—', color: 'var(--warning)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
                    { label: 'Total Alerts', value: stats ? stats.totalAlerts.toLocaleString() : '—', color: 'var(--info)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
                ].map((stat, i) => (
                    <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--bg-primary)', color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontWeight: 600, margin: 0 }}>{stat.label}</p>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {Object.keys(FILTER_MAP).map(filter => (
                            <button
                                key={filter}
                                onClick={() => handleFilterChange(filter)}
                                className={`btn ${severityFilter === filter ? 'btn-primary' : 'btn-outline'}`}
                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                    <button
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', opacity: processing === 'bulk' ? 0.6 : 1 }}
                        onClick={handleBulkAcknowledge}
                        disabled={processing === 'bulk'}
                    >
                        {processing === 'bulk' ? 'Processing...' : 'Bulk Acknowledge Page'}
                    </button>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Alert ID</th>
                                <th>Severity</th>
                                <th>Type</th>
                                <th>Shipment</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading alerts...</td></tr>
                            ) : result.data.map((alertItem, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{alertItem.id}</td>
                                    <td>
                                        <span className={`badge ${alertItem.severity === 'CRITICAL' ? 'badge-danger' : alertItem.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}`}>
                                            {alertItem.severity}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{alertItem.type?.replace(/_/g, ' ')}</td>
                                    <td style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{alertItem.shipment_id}</td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alertItem.message}</td>
                                    <td>
                                        <span className={`badge ${alertItem.status === 'OPEN' ? 'badge-danger' : alertItem.status === 'Acknowledged' ? 'badge-primary' : 'badge-success'}`}>
                                            {alertItem.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {alertItem.status === 'OPEN' ? (
                                                <>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', opacity: processing === alertItem.id ? 0.6 : 1 }}
                                                        onClick={() => handleAcknowledge(alertItem.id)}
                                                        disabled={processing === alertItem.id}
                                                    >
                                                        {processing === alertItem.id ? '...' : 'Ack'}
                                                    </button>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                                        onClick={() => handleIgnore(alertItem.id)}
                                                    >
                                                        Ignore
                                                    </button>
                                                </>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    {alertItem.status}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && result.data.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No alerts matching the filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                        Page {result.page} of {result.totalPages.toLocaleString()} ({result.total.toLocaleString()} total alerts)
                    </p>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={result.page <= 1}>← Prev</button>
                        {pageNumbers.map((p, i) => p < 0 ? <span key={i} style={{ padding: '0 0.25rem', color: 'var(--text-muted)' }}>…</span> : <button key={i} className={`btn ${p === result.page ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', minWidth: '2rem' }} onClick={() => setPage(p)}>{p}</button>)}
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }} onClick={() => setPage(p => Math.min(result.totalPages, p + 1))} disabled={result.page >= result.totalPages}>Next →</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
