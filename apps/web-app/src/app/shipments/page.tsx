import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ShipmentsPage() {
    return (
        <DashboardLayout
            title="Shipment Management"
            description="Track and manage global agricultural shipments and their verification status."
        >
            <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Active Shipments</h2>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input
                            type="text"
                            placeholder="Search ID, Origin..."
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'var(--glass-border)',
                                borderRadius: '6px',
                                padding: '0.5rem 1rem',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        <button style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                            New Shipment
                        </button>
                    </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>SHIPMENT ID</th>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>ORIGIN</th>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>DESTINATION</th>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>STATUS</th>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>VERIFICATION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { id: 'SHP-9021', origin: 'Finca Vista, CR', dest: 'Rotterdam, NL', status: 'In Transit', badge: 'badge-info', ml: 'Clean' },
                            { id: 'SHP-9020', origin: 'Hacienda Sol, CO', dest: 'Hamburg, DE', status: 'Delivered', badge: 'badge-success', ml: 'Clean' },
                            { id: 'SHP-9019', origin: 'Cooperativa Alta, GU', dest: 'Laredo, US', status: 'Flagged', badge: 'badge-danger', ml: 'Anomaly (Temp)' },
                            { id: 'SHP-9018', origin: 'Santa Rosa, BR', dest: 'Shanghai, CN', status: 'In Transit', badge: 'badge-info', ml: 'Clean' },
                            { id: 'SHP-9017', origin: 'Villa Rica, PE', dest: 'Le Havre, FR', status: 'Processing', badge: 'badge-warning', ml: 'Pending' }
                        ].map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background var(--transition-fast)' }}>
                                <td style={{ padding: '1.25rem 0', fontWeight: 600 }}>{row.id}</td>
                                <td style={{ padding: '1.25rem 0', color: 'var(--text-muted)' }}>{row.origin}</td>
                                <td style={{ padding: '1.25rem 0', color: 'var(--text-muted)' }}>{row.dest}</td>
                                <td style={{ padding: '1.25rem 0' }}><span className={`badge ${row.badge}`}>{row.status}</span></td>
                                <td style={{ padding: '1.25rem 0' }}>
                                    {row.ml === 'Clean' ?
                                        (<span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Validated</span>) :
                                        row.ml === 'Pending' ?
                                            (<span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> {row.ml}</span>) :
                                            (<span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> {row.ml}</span>)
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
