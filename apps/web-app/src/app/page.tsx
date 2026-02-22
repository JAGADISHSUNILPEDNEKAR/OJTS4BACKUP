import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Home() {
  return (
    <DashboardLayout>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>

        {/* Metric Card 1 */}
        <div className="glass-panel animate-fade-in delay-100">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Shipments</h3>
            <div style={{ padding: '0.25rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }} className="text-gradient">1,248</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--accent)' }}>↑ 12%</span>
            <span className="text-muted">from last week</span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="glass-panel animate-fade-in delay-200">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>ML Alerts (24h)</h3>
            <div style={{ padding: '0.25rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }} className="text-gradient">3</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--danger)' }}>Requiring Review</span>
            <span className="text-muted">Escrow Paused</span>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="glass-panel animate-fade-in delay-300">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className="text-muted" style={{ fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>BTC Anchors</h3>
            <div style={{ padding: '0.25rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="18" x2="12" y2="22"></line><line x1="12" y1="2" x2="12" y2="6"></line></svg>
            </div>
          </div>
          <p style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }} className="text-gradient">842</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--accent)' }}>Verified</span>
            <span className="text-muted">Testnet (Signet)</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

        {/* Recent Shipments Table */}
        <div className="glass-panel animate-fade-in delay-300" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Recent Activity</h2>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>View All</button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>ID</th>
                <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>Origin</th>
                <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>Status</th>
                <th className="text-muted" style={{ paddingBottom: '1rem', fontWeight: 600 }}>Verification</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'SHP-9021', origin: 'Finca Vista, CR', status: 'In Transit', badge: 'badge-info', ml: 'Clean' },
                { id: 'SHP-9020', origin: 'Hacienda Sol, CO', status: 'Delivered', badge: 'badge-success', ml: 'Clean' },
                { id: 'SHP-9019', origin: 'Cooperativa Alta, GU', status: 'Flagged', badge: 'badge-danger', ml: 'Anomaly (Temp)' }
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background var(--transition-fast)' }}>
                  <td style={{ padding: '1rem 0', fontWeight: 500 }}>{row.id}</td>
                  <td style={{ padding: '1rem 0', color: 'var(--text-muted)' }}>{row.origin}</td>
                  <td style={{ padding: '1rem 0' }}><span className={`badge ${row.badge}`}>{row.status}</span></td>
                  <td style={{ padding: '1rem 0' }}>
                    {row.ml === 'Clean' ?
                      (<span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Validated</span>) :
                      (<span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> {row.ml}</span>)
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* System Logs */}
        <div className="glass-panel animate-fade-in delay-300" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', margin: 0 }}>System Events</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { time: '2 mins ago', msg: 'Merkle root anchored to Bitcoin testnet', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', color: 'var(--warning)' },
              { time: '15 mins ago', msg: 'IoT batch ingestion completed (500 records)', icon: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', color: 'var(--primary)' },
              { time: '1 hour ago', msg: 'ML Isolation Forest retrained', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', color: 'var(--secondary)' },
            ].map((log, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '0.2rem', color: log.color }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={log.icon}></path></svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>{log.msg}</p>
                  <p className="text-muted" style={{ margin: 0, fontSize: '0.75rem' }}>{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
