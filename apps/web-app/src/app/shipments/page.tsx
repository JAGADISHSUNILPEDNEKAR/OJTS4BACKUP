"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { fetchShipments } from '@/lib/api';

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All Shipments');

    const filters = ['All Shipments', 'In Transit', 'Delivered', 'On Hold', 'Flagged'];

    useEffect(() => {
        const loadShipments = async () => {
            setLoading(true);
            const data = await fetchShipments();
            setShipments(data);
            setLoading(false);
        };
        loadShipments();
    }, []);

    const filteredShipments = shipments.filter(shp => {
        if (activeFilter === 'All Shipments') return true;
        return shp.status === activeFilter.toUpperCase().replace(' ', '_');
    });

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
                                onClick={() => setActiveFilter(filter)}
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
                        <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export Ledger
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
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShipments.map((shp, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{shp.id.substring(0, 8)}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600 }}>{shp.origin || 'Unknown'}</span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                            <span style={{ color: 'var(--text-muted)' }}>{shp.destination}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{shp.farmer_id.substring(0, 8)}</td>
                                    <td>
                                        <span className={`badge ${shp.status === 'DELIVERED' ? 'badge-success' : shp.status === 'ON_HOLD' ? 'badge-danger' : 'badge-primary'}`}>
                                            {shp.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', width: '80px' }}>
                                                <div style={{ height: '100%', width: `10%`, background: 'var(--secondary)', borderRadius: '3px' }}></div>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>10%</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date().toLocaleDateString()}</td>
                                    <td>
                                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredShipments.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        {loading ? 'Loading shipments...' : 'No shipments found matching the criteria.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="text-muted" style={{ fontSize: '0.75rem', margin: 0 }}>Showing {filteredShipments.length} of {shipments.length} shipments</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Previous</button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Next</button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
