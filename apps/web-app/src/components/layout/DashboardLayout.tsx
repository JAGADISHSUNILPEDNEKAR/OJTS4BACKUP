import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
    children,
    title,
    description
}: {
    children: React.ReactNode;
    title?: string;
    description?: string;
}) {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main style={{ background: 'var(--bg-primary)', overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <header style={{
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-light)',
                    padding: '0.75rem 2.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <div className="input-group" style={{ width: '400px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Search shipments, assets, or audits..." />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
                            <div style={{ position: 'relative', cursor: 'pointer' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                <div style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }}></div>
                            </div>
                            <div style={{ cursor: 'pointer' }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </div>
                        </div>

                        <div style={{ borderLeft: '1px solid var(--border-light)', height: '32px', margin: '0 0.5rem' }}></div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>Alex Rivera</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Enterprise Admin</p>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: '#e2e8f0',
                                    backgroundImage: 'url("https://i.pravatar.cc/150?u=alex@origin.io")',
                                    backgroundSize: 'cover'
                                }}></div>
                                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', background: 'var(--secondary)', borderRadius: '50%', border: '2px solid white' }}></div>
                            </div>
                        </div>
                    </div>
                </header>

                <div style={{ padding: '2rem 2.5rem', flex: 1 }}>
                    {title && (
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>{title}</h1>
                                    {description && <p style={{ color: 'var(--text-muted)' }}>{description}</p>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button className="btn btn-outline">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        Past 24 Hours
                                    </button>
                                    <button className="btn btn-outline">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                        Filters
                                    </button>
                                    <button className="btn btn-primary">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        New Shipment
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}
