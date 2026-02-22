import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AuditsPage() {
    return (
        <DashboardLayout
            title="System Audits & Compliance"
            description="Immutable audit logs and compliance reporting for regulatory oversight."
        >
            <div className="card">
                <p className="text-muted">Audit trail and compliance engine reports will be displayed here.</p>
            </div>
        </DashboardLayout>
    );
}
