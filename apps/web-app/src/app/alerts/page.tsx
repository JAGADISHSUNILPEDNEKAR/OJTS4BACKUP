import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AlertsPage() {
    const alerts = [
        { id: 'INC-2291', type: 'Route Deviation', severity: 'Critical', entity: 'STR-8812', assignee: 'Alex Rivera', time: '12m ago', status: 'Open' },
        { id: 'INC-2290', type: 'Unscheduled Stop', severity: 'Critical', entity: 'STR-8811', assignee: 'Unassigned', time: '24m ago', status: 'Open' },
        { id: 'INC-2289', type: 'Temperature Spike', severity: 'Warning', entity: 'STR-7721', assignee: 'Sarah Chen', time: '45m ago', status: 'Acknowledged' },
        { id: 'INC-2288', type: 'Geofence Exit', severity: 'Warning', entity: 'STR-6650', assignee: 'Marcus V.', time: '1h 12m ago', status: 'Investigating' },
        { id: 'INC-2287', type: 'Low Battery', severity: 'Info', entity: 'IOT-448', assignee: 'System Bot', time: '2h ago', status: 'Resolved' },
        { id: 'INC-2286', type: 'Firmware Update', severity: 'Info', entity: 'IOT-112', assignee: 'System Bot', time: '4h ago', status: 'Resolved' },
    ];

    return (
        <DashboardLayout
            title="Incident Response Center"
            description="Centralized command for anomaly resolution and manual intervention."
        >
            {/* Quick Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Open Critical', value: '14', color: 'var(--danger)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg> },
                    { label: 'Escrow Paused', value: '03', color: 'var(--warning)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
                    { label: 'Response Latency', value: '12m', color: 'var(--info)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
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
                        <button className="btn btn-outline" style={{ fontSize: '0.75rem' }}>Bulk Acknowledge</button>
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
                                <th>Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map((alert, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{alert.id}</td>
                                    <td>
                                        <span className={`badge ${alert.severity === 'Critical' ? 'badge-danger' : alert.severity === 'Warning' ? 'badge-warning' : 'badge-info'}`}>
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{alert.type}</td>
                                    <td style={{ fontWeight: 500 }}>{alert.entity}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0' }}></div>
                                            <span style={{ fontSize: '0.8125rem' }}>{alert.assignee}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{alert.time}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Acknowledge</button>
                                            <button className="btn btn-outline" style={{ padding: '0.4rem 0.8em', fontSize: '0.75rem' }}>Ignore</button>
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
