/**
 * Central Role Manifest for the Origin platform.
 *
 * Drives sidebar navigation, dashboard widget selection, and capability gating.
 * Backend roles live in services/<svc>/core/dependencies.py::UserRole — keep these in sync.
 */

export type UserRole =
    | 'SUPERADMIN'
    | 'COMPANY'
    | 'AUDITOR'
    | 'FARMER'
    | 'LOGISTICS'
    | 'RETAILER'
    | 'GOVERNMENT'
    | 'CONSUMER'
    | 'USER';

export type Capability =
    // Navigation / pages
    | 'nav.dashboard'
    | 'nav.shipments'
    | 'nav.alerts'
    | 'nav.escrow'
    | 'nav.audits'
    | 'nav.analytics'
    | 'nav.reports'
    // Domain actions
    | 'shipment.create'
    | 'shipment.handoff'
    | 'audit.request'
    | 'audit.verify'
    | 'escrow.settle'
    | 'alert.acknowledge'
    | 'alert.issue'
    | 'inventory.accept'
    | 'inventory.recordSale'
    | 'consumer.scanQR'
    | 'consumer.viewSourcing'
    | 'gov.exportReports'
    // Cross-cutting
    | 'analytics.view'
    | 'reports.view';

export type MetricKey =
    | 'totalShipments'
    | 'activeAlerts'
    | 'escrowHeld'
    | 'avgRiskScore'
    | 'soilHealth'
    | 'harvestYield'
    | 'complianceScore'
    | 'onTimeDelivery'
    | 'fuelEfficiency'
    | 'anomalyCount'
    | 'pendingAudits'
    | 'trustScore'
    | 'proofValidity'
    | 'productJourney'
    | 'sustainabilityRating'
    | 'shelfLife'
    | 'stockLevels'
    | 'inboundTransit'
    | 'foodSecurityIndex'
    | 'tradeVolume';

export interface NavItem {
    name: string;
    href: string;
    capability: Capability;
}

export interface PrimaryAction {
    label: string;
    capability: Capability;
    /** Path to navigate to, or a key the dashboard view maps to a handler */
    target: string;
}

export interface RoleConfig {
    /** Human-readable role label shown in the UI */
    label: string;
    /** Short badge label (e.g., shown next to user avatar) */
    badge: string;
    /** Capabilities this role is granted */
    capabilities: Capability[];
    /** Sidebar navigation items in display order */
    navItems: NavItem[];
    /** Top-level CTAs surfaced on the role's dashboard */
    primaryActions: PrimaryAction[];
    /** Metric cards shown on the role's dashboard, in display order */
    metricKeys: MetricKey[];
}

// ─── Shared nav item definitions ─────────────────────────────────
const NAV = {
    dashboard: { name: 'Dashboard', href: '/', capability: 'nav.dashboard' as Capability },
    shipments: { name: 'Shipments', href: '/shipments', capability: 'nav.shipments' as Capability },
    alerts: { name: 'Alerts', href: '/alerts', capability: 'nav.alerts' as Capability },
    escrow: { name: 'Escrow', href: '/crypto', capability: 'nav.escrow' as Capability },
    audits: { name: 'Audits', href: '/audits', capability: 'nav.audits' as Capability },
    analytics: { name: 'Analytics', href: '/analytics', capability: 'nav.analytics' as Capability },
    reports: { name: 'Reports', href: '/reports', capability: 'nav.reports' as Capability },
};

// ─── Role definitions ────────────────────────────────────────────
export const ROLES: Record<UserRole, RoleConfig> = {
    SUPERADMIN: {
        label: 'Platform Admin',
        badge: 'Admin',
        capabilities: [
            'nav.dashboard', 'nav.shipments', 'nav.alerts', 'nav.escrow', 'nav.audits',
            'nav.analytics', 'nav.reports',
            'shipment.create', 'shipment.handoff', 'audit.request', 'audit.verify',
            'escrow.settle', 'alert.acknowledge', 'alert.issue',
            'inventory.accept', 'inventory.recordSale',
            'consumer.scanQR', 'consumer.viewSourcing', 'gov.exportReports',
            'analytics.view', 'reports.view',
        ],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts, NAV.escrow, NAV.audits, NAV.analytics, NAV.reports],
        primaryActions: [
            { label: 'Initiate Shipment', capability: 'shipment.create', target: 'shipment.create' },
            { label: 'New Escrow', capability: 'escrow.settle', target: '/crypto' },
            { label: 'Request Audit', capability: 'audit.request', target: 'audit.request' },
        ],
        metricKeys: ['totalShipments', 'activeAlerts', 'escrowHeld', 'avgRiskScore'],
    },

    COMPANY: {
        label: 'Enterprise Operator',
        badge: 'Company',
        capabilities: [
            'nav.dashboard', 'nav.shipments', 'nav.alerts', 'nav.escrow', 'nav.audits',
            'nav.analytics', 'nav.reports',
            'shipment.create', 'shipment.handoff', 'audit.request',
            'escrow.settle', 'alert.acknowledge',
            'analytics.view', 'reports.view',
        ],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts, NAV.escrow, NAV.audits, NAV.analytics, NAV.reports],
        primaryActions: [
            { label: 'Initiate Shipment', capability: 'shipment.create', target: 'shipment.create' },
            { label: 'New Escrow', capability: 'escrow.settle', target: '/crypto' },
            { label: 'Request Audit', capability: 'audit.request', target: 'audit.request' },
        ],
        metricKeys: ['totalShipments', 'activeAlerts', 'escrowHeld', 'avgRiskScore'],
    },

    FARMER: {
        label: 'Farmer',
        badge: 'Farmer',
        capabilities: [
            'nav.dashboard', 'nav.shipments', 'nav.alerts',
            'shipment.create', 'audit.request',
        ],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts],
        primaryActions: [
            { label: 'Log Harvest', capability: 'shipment.create', target: 'shipment.create' },
            { label: 'Register Asset', capability: 'shipment.create', target: 'shipment.create' },
        ],
        metricKeys: ['soilHealth', 'harvestYield', 'complianceScore'],
    },

    LOGISTICS: {
        label: 'Logistics Coordinator',
        badge: 'Logistics',
        capabilities: [
            'nav.dashboard', 'nav.shipments', 'nav.alerts',
            'shipment.handoff',
        ],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts],
        primaryActions: [
            { label: 'Update GPS', capability: 'shipment.handoff', target: 'shipment.handoff' },
            { label: 'Scan Handover', capability: 'shipment.handoff', target: 'shipment.handoff' },
        ],
        metricKeys: ['onTimeDelivery', 'fuelEfficiency', 'anomalyCount'],
    },

    AUDITOR: {
        label: 'Auditor',
        badge: 'Auditor',
        capabilities: [
            'nav.dashboard', 'nav.shipments', 'nav.alerts', 'nav.audits', 'nav.reports',
            'audit.verify', 'reports.view',
        ],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts, NAV.audits, NAV.reports],
        primaryActions: [
            { label: 'Verify Manifest', capability: 'audit.verify', target: 'audit.verify' },
            { label: 'Start Inspection', capability: 'audit.verify', target: '/audits' },
        ],
        metricKeys: ['pendingAudits', 'trustScore', 'proofValidity'],
    },

    CONSUMER: {
        label: 'Consumer',
        badge: 'Consumer',
        capabilities: [
            'nav.dashboard',
            'consumer.scanQR', 'consumer.viewSourcing',
        ],
        navItems: [NAV.dashboard],
        primaryActions: [
            { label: 'Scan QR', capability: 'consumer.scanQR', target: 'consumer.scanQR' },
            { label: 'View Sourcing', capability: 'consumer.viewSourcing', target: 'consumer.viewSourcing' },
        ],
        metricKeys: ['productJourney', 'sustainabilityRating'],
    },

    RETAILER: {
        label: 'Retailer',
        badge: 'Retailer',
        capabilities: [
            'nav.dashboard', 'nav.shipments', 'nav.alerts',
            'inventory.accept', 'inventory.recordSale',
        ],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts],
        primaryActions: [
            { label: 'Accept Batch', capability: 'inventory.accept', target: 'inventory.accept' },
            { label: 'Record Sale', capability: 'inventory.recordSale', target: 'inventory.recordSale' },
        ],
        metricKeys: ['shelfLife', 'stockLevels', 'inboundTransit'],
    },

    GOVERNMENT: {
        label: 'Government Oversight',
        badge: 'Gov',
        capabilities: [
            'nav.dashboard', 'nav.shipments', 'nav.alerts', 'nav.audits',
            'nav.analytics', 'nav.reports',
            'alert.issue', 'gov.exportReports',
            'analytics.view', 'reports.view',
        ],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts, NAV.audits, NAV.analytics, NAV.reports],
        primaryActions: [
            { label: 'Export Reports', capability: 'gov.exportReports', target: '/reports' },
            { label: 'Issue Alerts', capability: 'alert.issue', target: 'alert.issue' },
        ],
        metricKeys: ['foodSecurityIndex', 'tradeVolume'],
    },

    USER: {
        label: 'User',
        badge: 'User',
        capabilities: ['nav.dashboard', 'nav.shipments', 'nav.alerts'],
        navItems: [NAV.dashboard, NAV.shipments, NAV.alerts],
        primaryActions: [],
        metricKeys: ['totalShipments', 'activeAlerts'],
    },
};

export const ALL_ROLES: UserRole[] = Object.keys(ROLES) as UserRole[];
