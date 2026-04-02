"use client";

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchShipments, Shipment, PaginatedResponse } from '@/lib/api';

export default function ShipmentsPage() {
    const [result, setResult] = useState<PaginatedResponse<Shipment>>({ data: [], total: 0, page: 1, totalPages: 1, pageSize: 100 });
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All Shipments');
    const [page, setPage] = useState(1);

    const FILTER_MAP: Record<string, string> = {
        'All Shipments': '',
        'In Transit': 'IN_TRANSIT',
        'Delivered': 'DELIVERED',
        'Delayed': 'DELAYED',
        'Cancelled': 'CANCELLED',
    };
    const filters = Object.keys(FILTER_MAP);

    const loadShipments = useCallback(async (p: number, filter: string) => {
        setLoading(true);
        const data = await fetchShipments(p, FILTER_MAP[filter] || '');
        setResult(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadShipments(page, activeFilter);
    }, [page, activeFilter, loadShipments]);

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
        setPage(1);
    };

    const handleExport = () => {
        const csvContent = [
            'Shipment ID,Origin,Destination,Farmer ID,Status,Risk Score,Date',
            ...result.data.map(s =>
                `${s.id},"${s.origin}","${s.destination}",${s.farmer_id},${s.status},${s.risk_score || 0},${s.created_at || ''}`
            )
        ].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shipments_page_${page}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Page navigation
    const pageNumbers = (() => {
        const pages: number[] = [];
        const total = result.totalPages;
        const current = result.page;
        const start = Math.max(1, current - 2);
        const end = Math.min(total, current + 2);
        if (start > 1) pages.push(1);
        if (start > 2) pages.push(-1); // ellipsis
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < total - 1) pages.push(-2); // ellipsis
        if (end < total) pages.push(total);
        return pages;
    })();

    return (
        <DashboardLayout
            title="Shipment Management"
            description="End-to-end telemetry and verification for global asset transfers."
        >
            <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => handleFilterChange(filter)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: '0.5rem 0',
                                    fontSize: '0.875rem',
                                    fontWeight: activeFilter === filter ? 700 : 500,
                                    color: activeFilter === filter ? 'var(--primary)' : 'var(--text-muted)',
                                    borderBottom: activeFilter === filter ? '2px solid var(--primary)' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)'
                                }}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }} onClick={handleExport}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export Page
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Shipment ID</th>
                                <th>Origin / Destination</th>
                                <th>Client Entity</th>
                                <th>Status</th>
                                <th>Risk Score</th>
                                <th>Date</th>
                                <th>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading shipments...</td></tr>
                            ) : result.data.map((shp, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{shp.id}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600 }}>{shp.origin || 'Unknown'}</span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                            <span style={{ color: 'var(--text-muted)' }}>{shp.destination}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{shp.farmer_id}</td>
                                    <td>
                                        <span className={`badge ${shp.status === 'DELIVERED' ? 'badge-success' : shp.status === 'DELAYED' ? 'badge-danger' : shp.status === 'CANCELLED' ? 'badge-warning' : 'badge-primary'}`}>
                                            {shp.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', width: '80px' }}>
                                                <div style={{ height: '100%', width: `${(shp.risk_score || 0) * 100}%`, background: (shp.risk_score || 0) > 0.8 ? 'var(--danger)' : (shp.risk_score || 0) > 0.4 ? 'var(--warning)' : 'var(--secondary)', borderRadius: '3px' }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{((shp.risk_score || 0) * 100).toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        {shp.created_at ? new Date(shp.created_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{shp.category || '—'}</td>
                                </tr>
                            ))}
                            {!loading && result.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No shipments found matching the criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>
                        Showing {((result.page - 1) * result.pageSize) + 1}–{Math.min(result.page * result.pageSize, result.total)} of <strong>{result.total.toLocaleString()}</strong> shipments
                    </p>
                    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <button
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={result.page <= 1}
                        >
                            ← Prev
                        </button>
                        {pageNumbers.map((p, i) =>
                            p < 0 ? (
                                <span key={i} style={{ padding: '0 0.25rem', color: 'var(--text-muted)' }}>…</span>
                            ) : (
                                <button
                                    key={i}
                                    className={`btn ${p === result.page ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', minWidth: '2rem' }}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </button>
                            )
                        )}
                        <button
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                            onClick={() => setPage(p => Math.min(result.totalPages, p + 1))}
                            disabled={result.page >= result.totalPages}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
