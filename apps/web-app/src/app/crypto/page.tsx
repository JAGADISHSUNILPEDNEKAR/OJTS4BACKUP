import DashboardLayout from '@/components/layout/DashboardLayout';

export default function CryptoPage() {
    return (
        <DashboardLayout
            title="Escrow & Bitcoin Anchoring"
            description="Immutable verification via Bitcoin Merkle anchoring and smart-escrow management."
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
                    <h3 className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1rem' }}>Total Anchors</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }} className="text-gradient">842</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>BTC Testnet (Signet)</p>
                </div>
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
                    <h3 className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1rem' }}>Escrow Volume</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }} className="text-gradient">$1.24M</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>USD Equivalent</p>
                </div>
                <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem' }}>
                    <h3 className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '1rem' }}>Trust Score</h3>
                    <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }} className="text-gradient">99.9%</p>
                    <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Network Consensus</p>
                </div>
            </div>

            <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', margin: 0 }}>Anchor History</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>TX HASH</th>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>MERKLE ROOT</th>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>HEIGHT</th>
                            <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>STATUS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { hash: '0x3f...1a2b', root: '0x8e...9c0d', height: '184,202', status: 'Confirmed' },
                            { hash: '0x7c...4f5e', root: '0x2a...4b6c', height: '184,198', status: 'Confirmed' },
                            { hash: '0x1d...8a9b', root: '0x5f...1e2d', height: '184,195', status: 'Confirmed' },
                            { hash: '0x9a...3c4d', root: '0x3b...7a8b', height: '184,192', status: 'Processing' },
                        ].map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1.25rem 0', color: 'var(--primary)', fontFamily: 'monospace' }}>{row.hash}</td>
                                <td style={{ padding: '1.25rem 0', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.root}</td>
                                <td style={{ padding: '1.25rem 0' }}>{row.height}</td>
                                <td style={{ padding: '1.25rem 0' }}>
                                    <span className={`badge ${row.status === 'Confirmed' ? 'badge-success' : 'badge-info'}`}>
                                        {row.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </DashboardLayout>
    );
}
