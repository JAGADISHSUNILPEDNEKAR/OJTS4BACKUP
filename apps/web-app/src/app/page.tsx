"use client";

import DashboardLayout from '@/components/layout/DashboardLayout';

export default function Home() {
  return (
    <DashboardLayout
      title="Operational Overview"
      description="Real-time supply chain integrity and risk management dashboard."
    >
      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Shipments', value: '1,284', change: '+12.5%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>, color: 'var(--primary)' },
          { label: 'Open ML Alerts', value: '42', change: '-4.2%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>, color: 'var(--danger)' },
          { label: 'Escrow Held', value: '$4.2M', change: '+8.1%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>, color: 'var(--secondary)' },
          { label: 'Avg Risk Index', value: '18.4', change: '-2.1%', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>, color: 'var(--text-muted)' },
        ].map((card, i) => (
          <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'var(--bg-primary)', color: card.color }}>
                {card.icon}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: card.change.startsWith('+') ? 'var(--secondary)' : 'var(--danger)' }}>
                {card.change.startsWith('+') ? '↗' : '↘'} {card.change}
              </span>
            </div>
            <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{card.label}</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Grid: Map & Execution Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Map Placeholder */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ height: '400px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Simple Grid/Map Pattern */}
            <div style={{ width: '100%', height: '100%', opacity: 0.1, backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div style={{ position: 'absolute', top: '2rem', left: '2rem', background: 'white', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>LIVE TELEMETRY</p>
              <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0 }}>1,284 assets active across 12 nodes</p>
            </div>
            <div style={{ position: 'absolute', top: '50%', left: '40%', transform: 'translate(-50%, -50%)', background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-light)', fontSize: '0.625rem', fontWeight: 700 }}>
              STR-8812
            </div>
          </div>
        </div>

        {/* Quick Execution Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>Quick Execution</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { title: 'Initiate Shipment', desc: 'Bind sensors and define escrow', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="22" height="5"></rect><polyline points="21 8 21 21 3 21 3 8"></polyline></svg> },
                { title: 'New Escrow Contract', desc: 'Multi-sig financial protection', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
                { title: 'Request Audit', desc: 'Verified compliance verification', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background var(--transition-fast)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ color: 'var(--primary)' }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>{item.title}</p>
                    <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ background: 'var(--bg-primary)', borderStyle: 'dashed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>SYSTEM STATUS</span>
              <span style={{ fontSize: '0.625rem', color: 'var(--secondary)', fontWeight: 700 }}>Operational</span>
            </div>
            <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0 }}>ML Inference Engine (v2.4) is running with 99.8% precision. No latency issues detected.</p>
          </div>
        </div>
      </div>

      {/* Activity & Feed Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700 }}>Recent Global Activity</h3>
            <button style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View All ↗</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Destination</th>
                <th>Status</th>
                <th>ML Risk</th>
                <th>ETA</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 'STR-9942', dest: 'Rotterdam, NL', status: 'In Transit', risk: 12, eta: '2h 15m' },
                { id: 'STR-8812', dest: 'Singapore, SG', status: 'Delayed', risk: 84, eta: '1d 4h' },
                { id: 'STR-7721', dest: 'Shanghai, CN', status: 'In Transit', risk: 21, eta: '4h 45m' },
                { id: 'STR-6650', dest: 'Long Beach, US', status: 'Clearance', risk: 45, eta: '6h 20m' },
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.id}</td>
                  <td>{row.dest}</td>
                  <td><span className={`badge ${row.status === 'Delayed' ? 'badge-danger' : row.status === 'Clearance' ? 'badge-warning' : 'badge-primary'}`}>{row.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ flex: 1, height: '4px', background: '#e2e8f0', borderRadius: '2px', width: '60px' }}>
                        <div style={{ height: '100%', width: `${row.risk}%`, background: row.risk > 50 ? 'var(--danger)' : 'var(--secondary)', borderRadius: '2px' }}></div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{row.risk}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{row.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>ML Risk Feed</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { type: 'ROUTE DEVIATION', target: 'STR-8812', severity: 'Critical', time: '12m ago' },
              { type: 'TEMP THRESHOLD', target: 'STR-6650', severity: 'High', time: '45m ago' },
              { type: 'UNSCHEDULED STOP', target: 'STR-7721', severity: 'Medium', time: '2h ago' },
            ].map((alert, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: alert.severity === 'Critical' ? 'var(--danger)' : alert.severity === 'High' ? 'var(--warning)' : 'var(--info)' }}></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 800 }}>{alert.type}</span>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{alert.time}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>Anomaly detected for {alert.target}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-outline" style={{ width: '100%', marginTop: '1.5rem', justifyContent: 'center' }}>Browse All Alerts</button>
        </div>
      </div>

      {/* Bottom Shortcuts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem' }}>
        {[
          { label: 'API Documentation', desc: 'Integrate Origin into your ERP.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
          { label: 'Live System Status', desc: 'Real-time performance monitoring.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg> },
          { label: 'Security & Compliance', desc: 'SOC2 and Merkle proof protocols.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
          { label: 'Support Center', desc: 'Direct access to technical help.', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> },
        ].map((item, i) => (
          <div key={i} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1.25rem' }}>
            <div style={{ color: 'var(--text-muted)' }}>{item.icon}</div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', margin: 0 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
