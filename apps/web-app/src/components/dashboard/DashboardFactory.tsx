"use client";

import { useUser } from '@/lib/auth-store';
import { normalizeRole } from '@/lib/permissions';
import type { UserRole } from '@/lib/roles.config';
import AdminDashboard from './views/AdminDashboard';
import FarmerDashboard from './views/FarmerDashboard';
import LogisticsDashboard from './views/LogisticsDashboard';
import AuditorDashboard from './views/AuditorDashboard';
import ConsumerDashboard from './views/ConsumerDashboard';
import RetailerDashboard from './views/RetailerDashboard';
import GovernmentDashboard from './views/GovernmentDashboard';

/**
 * Resolves which dashboard view to render based on the current user's role.
 * Unmapped roles (SUPERADMIN, COMPANY, USER, legacy ADMIN) fall through to
 * AdminDashboard so existing accounts keep the full-featured view.
 */
const ROLE_VIEW_MAP: Partial<Record<UserRole, React.ComponentType>> = {
    FARMER: FarmerDashboard,
    LOGISTICS: LogisticsDashboard,
    AUDITOR: AuditorDashboard,
    CONSUMER: ConsumerDashboard,
    RETAILER: RetailerDashboard,
    GOVERNMENT: GovernmentDashboard,
};

export default function DashboardFactory() {
    // useUser() returns null during SSR + first client render (see auth-store),
    // so SSR + first hydration both produce AdminDashboard. After hydration,
    // the role-specific view takes over with no hydration mismatch warning.
    const user = useUser();
    const role = normalizeRole(user?.role);
    const View = ROLE_VIEW_MAP[role] ?? AdminDashboard;
    return <View />;
}
