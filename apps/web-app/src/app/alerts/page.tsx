"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { acknowledgeAlert, ignoreAlert, bulkAcknowledgeAlerts } from '@/lib/api';

export default function AlertsPage() {
    const router = useRouter();
    const [alerts, setAlerts] = useState([
        { id: 'INC-2291', type: 'Route Deviation', severity: 'Critical', entity: 'STR-8812', assignee: 'Alex Rivera', time: '12m ago', status: 'Open' },
        { id: 'INC-2290', type: 'Unscheduled Stop', severity: 'Critical', entity: 'STR-8811', assignee: 'Unassigned', time: '24m ago', status: 'Open' },
        { id: 'INC-2289', type: 'Temperature Spike', severity: 'Warning', entity: 'STR-7721', assignee: 'Sarah Chen', time: '45m ago', status: 'Acknowledged' },
        { id: 'INC-2288', type: 'Geofence Exit', severity: 'Warning', entity: 'STR-6650', assignee: 'Marcus V.', time: '1h 12m ago', status: 'Investigating' },
        { id: 'INC-2287', type: 'Low Battery', severity: 'Info', entity: 'IOT-448', assignee: 'System Bot', time: '2h ago', status: 'Resolved' },
        { id: 'INC-2286', type: 'Firmware Update', severity: 'Info', entity: 'IOT-112', assignee: 'System Bot', time: '4h ago', status: 'Resolved' },
    ]);
    const [processing, setProcessing] = useState<string | null>(null);

    const handleAcknowledge = async (alertId: string) => {
        setProcessing(alertId);
        await acknowledgeAlert(alertId);
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'Acknowledged' } : a));
        setProcessing(null);
    };

    const handleIgnore = async (alertId: string) => {
        setProcessing(alertId);
        await ignoreAlert(alertId);
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        setProcessing(null);
    };

    const handleBulkAcknowledge = async () => {
        const openIds = alerts.filter(a => a.status === 'Open').map(a => a.id);
        if (openIds.length === 0) {
            alert('No open alerts to acknowledge');
            return;
        }
        setProcessing('bulk');
        await bulkAcknowledgeAlerts(openIds);
        setAlerts(prev => prev.map(a => a.status === 'Open' ? { ...a, status: 'Acknowledged' } : a));
        setProcessing(null);
        alert(`${openIds.length} alerts acknowledged`);
    };

    const openCount = alerts.filter(a => a.status === 'Open' && a.severity === 'Critical').length;
    const pausedCount = alerts.filter(a => a.status === 'Investigating').length;

    return (
        <DashboardLayout
            title="Incident Response Center"
            description="Centralized command for anomaly resolution and manual intervention."
        >
            {/* Quick Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Open Critical', value: openCount.toString().padStart(2, '0'), color: 'var(--danger)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> },
                    { label: 'Investigating', value: pausedCount.toString().padStart(2, '0'), color: 'var(--warning)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
                    { label: 'Total Alerts', value: alerts.length.toString().padStart(2, '0'), color: 'var(--info)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
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
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Active Incident Queue</h3>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', opacity: processing === 'bulk' ? 0.6 : 1 }}
                            onClick={handleBulkAcknowledge}
                            disabled={processing === 'bulk'}
                        >
                            {processing === 'bulk' ? 'Processing...' : 'Bulk Acknowledge'}
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Incident ID</th>
                                <th>Severity</th>
                                <th>Alert Type</th>
                                <th>Target Entity</th>
                                <th>Assignee</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map((alertItem, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{alertItem.id}</td>
                                    <td>
                                        <span className={`badge ${alertItem.severity === 'Critical' ? 'badge-danger' : alertItem.severity === 'Warning' ? 'badge-warning' : 'badge-info'}`}>
                                            {alertItem.severity}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{alertItem.type}</td>
                                    <td style={{ fontWeight: 500 }}>{alertItem.entity}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0' }}></div>
                                            <span style={{ fontSize: '0.8125rem' }}>{alertItem.assignee}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${alertItem.status === 'Open' ? 'badge-danger' : alertItem.status === 'Acknowledged' ? 'badge-primary' : alertItem.status === 'Investigating' ? 'badge-warning' : 'badge-success'}`}>
                                            {alertItem.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {alertItem.status === 'Open' ? (
                                                <>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', opacity: processing === alertItem.id ? 0.6 : 1 }}
                                                        onClick={() => handleAcknowledge(alertItem.id)}
                                                        disabled={processing === alertItem.id}
                                                    >
                                                        {processing === alertItem.id ? '...' : 'Acknowledge'}
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
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
