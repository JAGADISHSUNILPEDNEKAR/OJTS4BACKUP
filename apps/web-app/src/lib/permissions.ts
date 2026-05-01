/**
 * Permission helpers built on top of roles.config.ts.
 *
 * Use these instead of comparing role strings directly. They handle the legacy
 * `ADMIN` value still present in some localStorage sessions and unknown roles.
 */

import { ROLES, ALL_ROLES, type Capability, type RoleConfig, type UserRole } from './roles.config';
import type { User } from './api';

/**
 * Map any role string to a known UserRole.
 * Legacy `ADMIN` sessions are mapped to SUPERADMIN so existing logins keep working.
 * Unknown roles fall through to USER.
 */
export function normalizeRole(role: string | null | undefined): UserRole {
    if (!role) return 'USER';
    const upper = role.toUpperCase();
    if (upper === 'ADMIN') return 'SUPERADMIN';
    if ((ALL_ROLES as string[]).includes(upper)) return upper as UserRole;
    return 'USER';
}

/** Resolve the role config for a user (or USER fallback when null). */
export function getRoleConfig(user: User | null | undefined): RoleConfig {
    return ROLES[normalizeRole(user?.role)];
}

/** True when the user's role grants the given capability. */
export function can(user: User | null | undefined, capability: Capability): boolean {
    return getRoleConfig(user).capabilities.includes(capability);
}

/** True when the user holds any of the given capabilities. */
export function canAny(user: User | null | undefined, capabilities: Capability[]): boolean {
    const config = getRoleConfig(user);
    return capabilities.some(c => config.capabilities.includes(c));
}
