"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { generateReport, getCurrentUser } from '@/lib/api';

export default function ReportsPage() {
    const router = useRouter();
    const [generating, setGenerating] = useState<string | null>(null);

    useEffect(() => {
        const user = getCurrentUser();
        if (user && user.role !== 'ADMIN') {
            router.replace('/');
        }
    }, [router]);
    const [generatedReports, setGeneratedReports] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState('All');

    const reports = [
        { id: 'supply-chain', title: 'Supply Chain Summary', description: 'End-to-end visibility across shipment lifecycle, origin verification, and delivery metrics.', category: 'Operations', lastGenerated: 'Oct 24, 2024', frequency: 'Daily' },
        { id: 'compliance', title: 'Compliance & Audit Report', description: 'SOC2 compliance status, audit trail, and regulatory adherence across all active processes.', category: 'Compliance', lastGenerated: 'Oct 23, 2024', frequency: 'Weekly' },
        { id: 'financial', title: 'Financial Reconciliation', description: 'Bitcoin escrow settlements, pending transactions, and cross-border payment summary.', category: 'Finance', lastGenerated: 'Oct 22, 2024', frequency: 'Weekly' },
        { id: 'risk', title: 'ML Risk Assessment', description: 'Predictive analytics output, model performance metrics, and anomaly breakdown.', category: 'Intelligence', lastGenerated: 'Oct 24, 2024', frequency: 'Daily' },
        { id: 'iot', title: 'IoT Sensor Health', description: 'Sensor calibration status, battery levels, firmware versions, and connectivity metrics.', category: 'Operations', lastGenerated: 'Oct 21, 2024', frequency: 'Weekly' },
        { id: 'executive', title: 'Executive Dashboard Brief', description: 'High-level KPIs for C-suite review including revenue impact and operational efficiency.', category: 'Executive', lastGenerated: 'Oct 20, 2024', frequency: 'Monthly' },
    ];

    const categories = ['All', 'Operations', 'Compliance', 'Finance', 'Intelligence', 'Executive'];

    const filteredReports = reports.filter(r => {
        if (activeCategory === 'All') return true;
        return r.category === activeCategory;
    });

    const handleGenerate = async (reportId: string) => {
        setGenerating(reportId);
        await generateReport(reportId);
        await new Promise(resolve => setTimeout(resolve, 1200));
        setGeneratedReports(prev => [...prev, reportId]);
        setGenerating(null);
        alert(`Report "${reports.find(r => r.id === reportId)?.title}" generated successfully`);
    };

    const handleDownload = (reportId: string) => {
        const report = reports.find(r => r.id === reportId);
        const content = `ORIGIN PLATFORM - ${report?.title?.toUpperCase()}\n${'='.repeat(50)}\n\nGenerated: ${new Date().toLocaleString()}\nCategory: ${report?.category}\n\nThis is a simulated report export.\nIn production, this would contain the full report data.\n`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportId}_report.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <DashboardLayout
            title="Executive Reports"
            description="Consolidated performance reports and executive summaries."
        >
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Reports Available', value: reports.length.toString(), color: 'var(--primary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> },
                    { label: 'Generated Today', value: generatedReports.length.toString(), color: 'var(--secondary)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
                    { label: 'Categories', value: (categories.length - 1).toString(), color: 'var(--info)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
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

            {/* Category Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Report Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                {filteredReports.map((report) => (
                    <div key={report.id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, marginBottom: '0.25rem' }}>{report.title}</h3>
                                <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>{report.category}</span>
                            </div>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600 }}>{report.frequency}</span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                            {report.description}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last: {report.lastGenerated}</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {generatedReports.includes(report.id) && (
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                                        onClick={() => handleDownload(report.id)}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                        Download
                                    </button>
                                )}
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', opacity: generating === report.id ? 0.6 : 1 }}
                                    onClick={() => handleGenerate(report.id)}
                                    disabled={generating === report.id}
                                >
                                    {generating === report.id ? (
                                        <>Generating...</>
                                    ) : generatedReports.includes(report.id) ? (
                                        <>Regenerate</>
                                    ) : (
                                        <>Generate Report</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
}
