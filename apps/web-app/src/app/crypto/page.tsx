import DashboardLayout from '@/components/layout/DashboardLayout';

export default function CryptoPage() {
    const escrows = [
        { id: 'ESC-8842', counterparty: 'GlobalAgri Ltd.', value: '1.2 BTC', status: 'Locked', date: 'Oct 24, 2024', risk: 8 },
        { id: 'ESC-8841', counterparty: 'TerraLogistics', value: '0.85 BTC', status: 'Partially Released', date: 'Oct 23, 2024', risk: 12 },
        { id: 'ESC-8840', counterparty: 'PacOcean Corp', value: '2.5 BTC', status: 'Settled', date: 'Oct 22, 2024', risk: 4 },
        { id: 'ESC-8839', counterparty: 'EuroProduce', value: '0.4 BTC', status: 'Disputed', date: 'Oct 22, 2024', risk: 78 },
        { id: 'ESC-8838', counterparty: 'SinoTrans', value: '3.2 BTC', status: 'Locked', date: 'Oct 21, 2024', risk: 15 },
        { id: 'ESC-8837', counterparty: 'NordicTrade', value: '1.1 BTC', status: 'Settled', date: 'Oct 20, 2024', risk: 2 },
    ];

    return (
        <DashboardLayout
            title="Escrow & Financial Settlements"
            description="Secure Bitcoin-anchored escrow contracts and cross-border settlement oversight."
        >
            {/* Quick Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Escrow Volume (BTC)', value: '128.4', change: '+12.5%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>, color: 'var(--primary)' },
                    { label: 'Settled Today', value: '12', change: '+2.1%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, color: 'var(--secondary)' },
                    { label: 'Active Contracts', value: '142', change: '+5.4%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>, color: 'var(--info)' },
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
                        <button className="btn btn-outline" style={{ fontSize: '0.75rem' }}>Filter Assets</button>
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
                                {escrows.map((escrow, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{escrow.id}</td>
                                        <td style={{ fontWeight: 600 }}>{escrow.counterparty}</td>
                                        <td style={{ fontWeight: 700 }}>{escrow.value}</td>
                                        <td>
                                            <span className={`badge ${escrow.status === 'Settled' ? 'badge-success' : escrow.status === 'Disputed' ? 'badge-danger' : escrow.status === 'Locked' ? 'badge-primary' : 'badge-warning'}`}>
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
                                            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
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
                            <button className="btn btn-primary" style={{ background: 'var(--danger)', width: '100%', justifyContent: 'center' }}>Investigate Incident</button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
