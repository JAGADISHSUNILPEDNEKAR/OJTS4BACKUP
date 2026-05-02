import { describe, it, expect } from 'vitest';
import { normalizeRole, getRoleConfig, can, canAny } from './permissions';
import { ROLES, ALL_ROLES, type UserRole, type Capability } from './roles.config';
import type { User } from './api';

const userWith = (role: string): User => ({ email: 'u@x.com', role });

describe('normalizeRole', () => {
    it.each(ALL_ROLES)('round-trips %s', (role) => {
        expect(normalizeRole(role)).toBe(role);
    });

    it('maps legacy ADMIN to SUPERADMIN', () => {
        expect(normalizeRole('ADMIN')).toBe('SUPERADMIN');
    });

    it('uppercases mixed-case input', () => {
        expect(normalizeRole('farmer')).toBe('FARMER');
        expect(normalizeRole('Farmer')).toBe('FARMER');
    });

    it('falls back to USER for null / undefined / empty / unknown', () => {
        expect(normalizeRole(null)).toBe('USER');
        expect(normalizeRole(undefined)).toBe('USER');
        expect(normalizeRole('')).toBe('USER');
        expect(normalizeRole('NONSENSE')).toBe('USER');
    });
});

describe('getRoleConfig', () => {
    it.each(ALL_ROLES)('returns the matching config for %s', (role) => {
        expect(getRoleConfig(userWith(role))).toBe(ROLES[role]);
    });

    it('returns USER config for null / undefined user', () => {
        expect(getRoleConfig(null)).toBe(ROLES.USER);
        expect(getRoleConfig(undefined)).toBe(ROLES.USER);
    });

    it('returns USER config for unknown role string', () => {
        expect(getRoleConfig(userWith('TYPO_ROLE'))).toBe(ROLES.USER);
    });
});

// Parallel source of truth: which roles SHOULD hold each capability.
// Kept here independent of roles.config so a typo / accidental edit there
// will cause this test to fail loudly.
const EXPECTED: Record<Capability, UserRole[]> = {
    // Navigation
    'nav.dashboard':       ['SUPERADMIN', 'COMPANY', 'AUDITOR', 'FARMER', 'LOGISTICS', 'RETAILER', 'GOVERNMENT', 'CONSUMER', 'USER'],
    'nav.shipments':       ['SUPERADMIN', 'COMPANY', 'AUDITOR', 'FARMER', 'LOGISTICS', 'RETAILER', 'GOVERNMENT', 'USER'],
    'nav.alerts':          ['SUPERADMIN', 'COMPANY', 'AUDITOR', 'FARMER', 'LOGISTICS', 'RETAILER', 'GOVERNMENT', 'USER'],
    'nav.escrow':          ['SUPERADMIN', 'COMPANY'],
    'nav.audits':          ['SUPERADMIN', 'COMPANY', 'AUDITOR', 'GOVERNMENT'],
    'nav.analytics':       ['SUPERADMIN', 'COMPANY', 'GOVERNMENT'],
    'nav.reports':         ['SUPERADMIN', 'COMPANY', 'AUDITOR', 'GOVERNMENT'],
    // Domain actions
    'shipment.create':     ['SUPERADMIN', 'COMPANY', 'FARMER'],
    'shipment.handoff':    ['SUPERADMIN', 'COMPANY', 'LOGISTICS'],
    'audit.request':       ['SUPERADMIN', 'COMPANY', 'FARMER'],
    'audit.verify':        ['SUPERADMIN', 'AUDITOR'],
    'escrow.settle':       ['SUPERADMIN', 'COMPANY'],
    'alert.acknowledge':   ['SUPERADMIN', 'COMPANY'],
    'alert.issue':         ['SUPERADMIN', 'GOVERNMENT'],
    'inventory.accept':    ['SUPERADMIN', 'RETAILER'],
    'inventory.recordSale':['SUPERADMIN', 'RETAILER'],
    'consumer.scanQR':     ['SUPERADMIN', 'CONSUMER'],
    'consumer.viewSourcing':['SUPERADMIN', 'CONSUMER'],
    'gov.exportReports':   ['SUPERADMIN', 'GOVERNMENT'],
    // Cross-cutting
    'analytics.view':      ['SUPERADMIN', 'COMPANY', 'GOVERNMENT'],
    'reports.view':        ['SUPERADMIN', 'COMPANY', 'AUDITOR', 'GOVERNMENT'],
};

describe('can() — full role × capability matrix', () => {
    for (const [capability, allowedRoles] of Object.entries(EXPECTED) as [Capability, UserRole[]][]) {
        for (const role of ALL_ROLES) {
            const shouldAllow = allowedRoles.includes(role);
            it(`${role} ${shouldAllow ? 'CAN' : 'cannot'} ${capability}`, () => {
                expect(can(userWith(role), capability)).toBe(shouldAllow);
            });
        }
    }

    it('null user uses USER fallback (has nav.dashboard, lacks shipment.create)', () => {
        expect(can(null, 'nav.dashboard')).toBe(true);
        expect(can(null, 'shipment.create')).toBe(false);
    });

    it('legacy ADMIN role string grants SUPERADMIN capabilities', () => {
        expect(can(userWith('ADMIN'), 'escrow.settle')).toBe(true);
        expect(can(userWith('ADMIN'), 'gov.exportReports')).toBe(true);
    });
});

describe('canAny', () => {
    it('returns true if at least one capability is held', () => {
        expect(canAny(userWith('FARMER'), ['shipment.create', 'audit.verify'])).toBe(true);
    });

    it('returns false if none are held', () => {
        expect(canAny(userWith('CONSUMER'), ['shipment.create', 'audit.verify'])).toBe(false);
    });

    it('returns false on empty list', () => {
        expect(canAny(userWith('SUPERADMIN'), [])).toBe(false);
    });

    it('null user falls back to USER capabilities', () => {
        expect(canAny(null, ['nav.dashboard'])).toBe(true);
        expect(canAny(null, ['shipment.create', 'escrow.settle'])).toBe(false);
    });
});

describe('matrix coverage', () => {
    it('every Capability in roles.config is in the EXPECTED matrix', () => {
        // Collect every capability mentioned anywhere in ROLES.
        const allUsed = new Set<Capability>();
        for (const role of ALL_ROLES) {
            for (const c of ROLES[role].capabilities) allUsed.add(c);
        }
        const expectedKeys = new Set(Object.keys(EXPECTED));
        const missing = [...allUsed].filter(c => !expectedKeys.has(c));
        expect(missing).toEqual([]);
    });
});
