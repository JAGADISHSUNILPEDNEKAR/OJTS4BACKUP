import DashboardLayout from '@/components/layout/DashboardLayout';

export default function ReportsPage() {
    return (
        <DashboardLayout
            title="Executive Reports"
            description="Consolidated performance reports and executive summaries."
        >
            <div className="card">
                <p className="text-muted">Consolidated reports and executive summaries will be displayed here.</p>
            </div>
        </DashboardLayout>
    );
}
