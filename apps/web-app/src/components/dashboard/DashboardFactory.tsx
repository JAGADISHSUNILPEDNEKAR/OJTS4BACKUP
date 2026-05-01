"use client";

import { getCurrentUser } from '@/lib/api';
import { normalizeRole } from '@/lib/permissions';
import type { UserRole } from '@/lib/roles.config';
import AdminDashboard from './views/AdminDashboard';
import FarmerDashboard from './views/FarmerDashboard';

/**
 * Resolves which dashboard view to render based on the current user's role.
 *
 * As new role views are built (Phase 3+), add them to ROLE_VIEW_MAP. Roles
 * not yet mapped fall through to AdminDashboard, which preserves the legacy
 * full-featured dashboard for SUPERADMIN/COMPANY and any unknown role.
 */
const ROLE_VIEW_MAP: Partial<Record<UserRole, React.ComponentType>> = {
    FARMER: FarmerDashboard,
    // LOGISTICS, AUDITOR, RETAILER, GOVERNMENT, CONSUMER — added in later sub-phases.
};

export default function DashboardFactory() {
    // getCurrentUser() returns null during SSR (no window), so SSR + first render
    // both produce AdminDashboard. After client hydration, the role-specific view
    // takes over — same pattern Sidebar/DashboardLayout already use.
    const role = normalizeRole(getCurrentUser()?.role);
    const View = ROLE_VIEW_MAP[role] ?? AdminDashboard;
    return <View />;
}
