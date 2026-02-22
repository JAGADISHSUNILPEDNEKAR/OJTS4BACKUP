import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
    children,
    title = "Platform Overview",
    description = "Real-time agricultural supply chain monitoring and fraud detection."
}: {
    children: React.ReactNode;
    title?: string;
    description?: string;
}) {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <main style={{ padding: '2.5rem 3rem', overflowY: 'auto', height: '100vh' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }} className="text-gradient">{title}</h1>
                        <p className="text-muted">{description}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button style={{
                            background: 'var(--glass-bg)',
                            border: 'var(--glass-border)',
                            color: 'var(--text-main)',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}>
                            Generate Report
                        </button>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            A
                        </div>
                    </div>
                </header>
                {children}
            </main>
        </div>
    );
}
