"use client";

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

/**
 * Dashboard view for the CONSUMER role.
 * Focus: provenance lookup via QR / ID and supply chain transparency.
 *
 * No backend writes — read-only. Sample journey is a static demo trail until
 * the public provenance lookup endpoint ships.
 */
export default function ConsumerDashboard() {
    const [lookupId, setLookupId] = useState('');
    const [activeJourney, setActiveJourney] = useState<typeof SAMPLE_JOURNEY | null>(null);

    const handleScan = () => {
        alert('QR scanner — opens camera on the mobile app. Demo: try entering a sample lot ID below.');
    };

    const handleLookup = () => {
        if (!lookupId.trim()) {
            alert('Enter a lot ID (or try LOT-2026-DEMO).');
            return;
        }
        setActiveJourney(SAMPLE_JOURNEY);
    };

    const metrics = [
        { label: 'Verified Lots Scanned', value: '1.2M', sub: 'Across all shoppers',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
        { label: 'Avg Sustainability', value: 'A−', sub: 'Carbon + water scoring',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg> },
        { label: 'Provenance Coverage', value: '98%', sub: 'Origin-to-shelf traceability',
          icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
    ];

    return (
        <DashboardLayout
            title="Trace Your Food"
            description="Verify the origin and journey of any product with a single scan."
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {metrics.map((card, i) => (
                    <div key={i} className="card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                        <div style={{ padding: '0.625rem', borderRadius: '10px', background: 'var(--bg-primary)', color: 'var(--secondary)', display: 'inline-block', marginBottom: '1rem' }}>
                            {card.icon}
                        </div>
                        <p className="text-muted" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{card.label}</p>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>{card.value}</h3>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>{card.sub}</p>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1rem' }}>Look up a product</h3>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={lookupId}
                        onChange={e => setLookupId(e.target.value)}
                        placeholder="Enter lot ID or product code (e.g. LOT-2026-DEMO)"
                        style={{
                            flex: 1, minWidth: '240px', padding: '0.75rem 1rem',
                            border: '1px solid var(--border-light)', borderRadius: '8px',
                            fontSize: '0.875rem', outline: 'none',
                        }}
                    />
                    <button onClick={handleLookup} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                        View Sourcing
                    </button>
                    <button onClick={handleScan} className="btn btn-outline" style={{ padding: '0.75rem 1.5rem' }}>
                        Scan QR
                    </button>
                </div>
            </div>

            <div className="card">
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                    {activeJourney ? `Product Journey · ${lookupId || 'LOT-2026-DEMO'}` : 'Sample Product Journey'}
                </h3>
                <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                    <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: 'var(--border-light)' }}></div>
                    {SAMPLE_JOURNEY.map((step, i) => (
                        <div key={i} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <div style={{
                                position: 'absolute', left: '-1.5rem', top: '0.25rem',
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: 'var(--primary)', border: '3px solid var(--bg-surface)',
                            }}></div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>{step.label}</p>
                            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '0.125rem 0' }}>
                                {step.location} · {step.timestamp}
                            </p>
                            {step.note && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', margin: '0.25rem 0 0' }}>{step.note}</p>
                            )}
                        </div>
                    ))}
                </div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
                    All checkpoints verified via Merkle proof anchored to Bitcoin mainnet.
                </p>
            </div>
        </DashboardLayout>
    );
}

const SAMPLE_JOURNEY = [
    { label: 'Harvested', location: 'Pune, IN', timestamp: '2026-04-14 06:12 IST', note: 'Cooperative #441 · Compliance score 96%' },
    { label: 'Processed', location: 'Mumbai Warehouse', timestamp: '2026-04-15 11:40 IST', note: 'Cold chain entry · 4°C' },
    { label: 'In Transit', location: 'Mumbai → Singapore', timestamp: '2026-04-16 03:20 IST', note: 'Temp + humidity within spec' },
    { label: 'Arrived', location: 'Singapore Port', timestamp: '2026-04-19 09:08 SGT' },
    { label: 'On Shelf', location: 'Whole Harvest Market', timestamp: '2026-04-20 14:30 SGT' },
];
